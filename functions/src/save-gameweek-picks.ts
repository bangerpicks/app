import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import type { APIFootballFixture } from './api-football-types'
import {
  planSaveGameweekPicks,
  type PlanExistingEntry,
  type PlanFixture,
} from './save-gameweek-picks-plan'
import { refreshWeeklyStandingsForGameweek } from './standings-update'

type Pick = 'H' | 'D' | 'A'

/**
 * Legacy client match metadata. v1.2.11: still accepted so older clients keep
 * working, but IGNORED. The server reads the gameweek's own fixtures for the slate,
 * statuses, kickoffs and the denormalized team/league fields.
 */
export type SaveGameweekPicksMatchInput = {
  fixtureId: number
  homeTeam?: { id: number; name: string; logo: string }
  awayTeam?: { id: number; name: string; logo: string }
  league?: { id: number; name: string; logo?: string }
  fixtureDateMs?: number
  matchStatus?: string
  score?: { home: number; away: number } | null
}

export type SaveGameweekPicksRequest = {
  gameweekId: string
  picks: Array<{ fixtureId: number; pick: Pick }>
  matches?: SaveGameweekPicksMatchInput[]
}

type ServerFixture = PlanFixture & { api: APIFootballFixture | undefined }

function toMillis(value: unknown): number | null {
  if (value && typeof (value as admin.firestore.Timestamp).toMillis === 'function') {
    return (value as admin.firestore.Timestamp).toMillis()
  }
  return null
}

function readServerFixture(
  doc: FirebaseFirestore.QueryDocumentSnapshot
): ServerFixture | null {
  const data = doc.data()
  const fixtureId =
    typeof data.fixtureId === 'number' ? data.fixtureId : Number.parseInt(doc.id, 10)
  if (!Number.isInteger(fixtureId) || fixtureId <= 0) return null
  const api = data.fixture as APIFootballFixture | undefined
  const statusShort = api?.fixture?.status?.short || 'NS'
  const ts = api?.fixture?.timestamp
  const kickoffMs = typeof ts === 'number' && ts > 0 ? ts * 1000 : null
  return { fixtureId, statusShort, kickoffMs, api }
}

export async function executeSaveGameweekPicks(
  db: admin.firestore.Firestore,
  uid: string,
  data: SaveGameweekPicksRequest,
  nowMs: number = Date.now()
): Promise<{ joinedGameweek: boolean }> {
  const gameweekId = typeof data?.gameweekId === 'string' ? data.gameweekId.trim() : ''
  if (!gameweekId || !/^[A-Za-z0-9_-]{1,80}$/.test(gameweekId)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid gameweekId')
  }
  if (!Array.isArray(data.picks) || data.picks.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'picks are required')
  }
  if (data.picks.length > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'Too many picks')
  }

  const gameweekRef = db.collection('gameweeks').doc(gameweekId)
  const cacheRef = db.collection('users').doc(uid).collection('gameweek_predictions').doc(gameweekId)
  const userRef = db.collection('users').doc(uid)
  const standingsRef = db.collection('weeklyStandings').doc(gameweekId)

  // Transaction: the awarded / lock / slate checks and the writes see the same data,
  // so autoScoring can't award an entry between our read and our write.
  const result = await db.runTransaction(async (tx) => {
    const [settingsSnap, gwSnap, fixturesSnap, cacheSnap, userSnap] = await Promise.all([
      tx.get(db.doc('settings/app')),
      tx.get(gameweekRef),
      tx.get(gameweekRef.collection('fixtures')),
      tx.get(cacheRef),
      tx.get(userRef),
    ])

    const settings = settingsSnap.exists ? settingsSnap.data() || {} : {}
    if (settings.maintenanceMode === true || settings.maintenance === true) {
      throw new functions.https.HttpsError('failed-precondition', 'App is in maintenance mode')
    }
    // Invite gate: only accounts that passed registration (users/{uid} exists) can play.
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('permission-denied', 'REGISTRATION_CLOSED')
    }
    if (!gwSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Gameweek not found')
    }
    const gw = gwSnap.data()!

    const fixtures: ServerFixture[] = []
    for (const doc of fixturesSnap.docs) {
      const f = readServerFixture(doc)
      if (f) fixtures.push(f)
    }

    // Authoritative existing picks: the user's entry for every fixture in the round.
    const entryRefs = fixtures.map((f) =>
      db.collection('predictions').doc(String(f.fixtureId)).collection('entries').doc(uid)
    )
    const entrySnaps = await Promise.all(entryRefs.map((ref) => tx.get(ref)))
    const existingEntries = new Map<number, PlanExistingEntry>()
    entrySnaps.forEach((snap, i) => {
      if (!snap.exists) return
      const d = snap.data() || {}
      existingEntries.set(fixtures[i].fixtureId, {
        pick: typeof d.pick === 'string' ? d.pick : undefined,
        awarded: d.awarded === true,
        gameweekId: typeof d.gameweekId === 'string' ? d.gameweekId : undefined,
      })
    })

    const plan = planSaveGameweekPicks({
      gameweekId,
      gameweek: {
        status: gw.status,
        lockAtMs: toMillis(gw.lockAt) ?? toMillis(gw.deadline),
        forceOpenForTesting: gw.forceOpenForTesting === true,
      },
      fixtures,
      picks: data.picks,
      existingEntries,
      nowMs,
    })

    if (!plan.ok) {
      throw new functions.https.HttpsError(plan.code, plan.message)
    }
    if (plan.writes.length === 0) {
      return { joinedGameweek: false, wrote: false }
    }

    const creatingCache = !cacheSnap.exists
    const firstNewFixtureId = creatingCache
      ? plan.writes.find((w) => w.isNew)?.fixtureId ?? null
      : null

    const now = admin.firestore.FieldValue.serverTimestamp()
    const fixtureById = new Map(fixtures.map((f) => [f.fixtureId, f]))

    for (const write of plan.writes) {
      const parentRef = db.collection('predictions').doc(String(write.fixtureId))
      const entryRef = parentRef.collection('entries').doc(uid)

      if (!write.isNew) {
        // Pick change only. Never touch awarded / points / correct / result.
        tx.set(parentRef, { exists: true }, { merge: true })
        tx.update(entryRef, { pick: write.pick })
        continue
      }

      tx.set(
        parentRef,
        { exists: true, playerCount: admin.firestore.FieldValue.increment(1) },
        { merge: true }
      )

      const server = fixtureById.get(write.fixtureId)
      const api = server?.api
      tx.set(entryRef, {
        uid,
        fixtureId: write.fixtureId,
        gameweekId,
        pick: write.pick,
        createdAt: now,
        awarded: false,
        points: 0,
        correct: null,
        homeTeam: {
          id: api?.teams?.home?.id ?? 0,
          name: api?.teams?.home?.name ?? '',
          logo: api?.teams?.home?.logo ?? '',
        },
        awayTeam: {
          id: api?.teams?.away?.id ?? 0,
          name: api?.teams?.away?.name ?? '',
          logo: api?.teams?.away?.logo ?? '',
        },
        league: {
          id: api?.league?.id ?? 0,
          name: api?.league?.name ?? '',
          country: api?.league?.country ?? '',
          logo: api?.league?.logo ?? '',
        },
        fixtureDate: admin.firestore.Timestamp.fromMillis(server?.kickoffMs ?? nowMs),
        status: server?.statusShort ?? 'NS',
        result: null,
      })
    }

    const prevJoined = cacheSnap.exists ? cacheSnap.data()?.joinedFixtureId : undefined
    if (creatingCache && firstNewFixtureId != null) {
      tx.set(cacheRef, {
        predictions: plan.mergedPredictions,
        updatedAt: now,
        joinedFixtureId: String(firstNewFixtureId),
      })
      tx.set(gameweekRef, { playerCount: admin.firestore.FieldValue.increment(1) }, { merge: true })
    } else {
      tx.set(cacheRef, {
        predictions: plan.mergedPredictions,
        updatedAt: now,
        ...(prevJoined ? { joinedFixtureId: prevJoined } : {}),
      })
    }

    return { joinedGameweek: creatingCache && firstNewFixtureId != null, wrote: true }
  })

  if (result.wrote) {
    // Outside the transaction: refresh Rankings snapshot (picks + player list) for this week.
    try {
      await refreshWeeklyStandingsForGameweek(db, gameweekId, nowMs)
    } catch (error) {
      console.warn('[saveGameweekPicks] weeklyStandings refresh failed', error)
      try {
        await standingsRef.set(
          { gameweekId, dirtyAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        )
      } catch (dirtyError) {
        console.warn('[saveGameweekPicks] weeklyStandings dirty flag failed', dirtyError)
      }
    }
  }
  return { joinedGameweek: result.joinedGameweek }
}

export const saveGameweekPicksHandler = async (
  data: SaveGameweekPicksRequest,
  context: functions.https.CallableContext
): Promise<{ joinedGameweek: boolean }> => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
  }
  const db = admin.firestore()
  try {
    return await executeSaveGameweekPicks(db, context.auth.uid, data)
  } catch (error: unknown) {
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    console.error('[saveGameweekPicks] Error:', error)
    throw new functions.https.HttpsError('internal', 'Failed to save picks')
  }
}
