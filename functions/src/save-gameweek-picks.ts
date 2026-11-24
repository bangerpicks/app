import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
// Keep in sync with src/lib/save-gameweek-picks-server.mjs
import {
  fixturesNeedingWriteServer,
  firstNewEntryFixtureId,
} from './save-gameweek-picks-server.mjs'

type Pick = 'H' | 'D' | 'A'

export type SaveGameweekPicksMatchInput = {
  fixtureId: number
  homeTeam: { id: number; name: string; logo: string }
  awayTeam: { id: number; name: string; logo: string }
  league: { id: number; name: string; logo?: string }
  fixtureDateMs: number
  matchStatus?: string
  score?: { home: number; away: number } | null
}

export type SaveGameweekPicksRequest = {
  gameweekId: string
  picks: Array<{ fixtureId: number; pick: Pick }>
  matches: SaveGameweekPicksMatchInput[]
}

function effectiveLock(
  gw: FirebaseFirestore.DocumentData
): admin.firestore.Timestamp | undefined {
  const lockAt = gw.lockAt as admin.firestore.Timestamp | undefined
  const deadline = gw.deadline as admin.firestore.Timestamp | undefined
  return lockAt ?? deadline
}

function picksWindowOpen(
  gw: FirebaseFirestore.DocumentData,
  fixtureStatus: string
): boolean {
  if (gw.status !== 'active') return false
  if (gw.forceOpenForTesting === true) return true
  const lock = effectiveLock(gw)
  if (!lock) return false
  if (admin.firestore.Timestamp.now().toMillis() >= lock.toMillis()) return false
  const short = fixtureStatus || 'NS'
  return short === 'NS' || short === 'TBD'
}

export async function executeSaveGameweekPicks(
  db: admin.firestore.Firestore,
  uid: string,
  data: SaveGameweekPicksRequest
): Promise<{ joinedGameweek: boolean }> {
  const gameweekId = typeof data.gameweekId === 'string' ? data.gameweekId.trim() : ''
  if (!gameweekId || !/^[A-Za-z0-9_-]{1,80}$/.test(gameweekId)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid gameweekId')
  }

  if (!Array.isArray(data.matches) || data.matches.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'matches are required')
  }
  if (!Array.isArray(data.picks) || data.picks.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'picks are required')
  }

  const settingsSnap = await db.doc('settings/app').get()
  if (settingsSnap.exists && settingsSnap.data()?.maintenanceMode === true) {
    throw new functions.https.HttpsError('failed-precondition', 'App is in maintenance mode')
  }

  const gwSnap = await db.collection('gameweeks').doc(gameweekId).get()
  if (!gwSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Gameweek not found')
  }
  const gw = gwSnap.data()!

  const matchByFixture = new Map<number, SaveGameweekPicksMatchInput>()
  for (const m of data.matches) {
    if (typeof m.fixtureId !== 'number') continue
    matchByFixture.set(m.fixtureId, m)
  }

  const predictionMap = new Map<number, Pick>()
  for (const p of data.picks) {
    if (typeof p.fixtureId !== 'number' || (p.pick !== 'H' && p.pick !== 'D' && p.pick !== 'A')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid pick payload')
    }
    predictionMap.set(p.fixtureId, p.pick)
  }

  const expectedFixtureIds = [...matchByFixture.keys()].sort((a, b) => a - b)
  if (expectedFixtureIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'No fixtures in slate')
  }

  for (const fixtureId of expectedFixtureIds) {
    if (!predictionMap.has(fixtureId)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `All ${expectedFixtureIds.length} matches must have a pick`
      )
    }
    const match = matchByFixture.get(fixtureId)!
    const status = match.matchStatus || 'NS'
    if (!picksWindowOpen(gw, status)) {
      throw new functions.https.HttpsError('failed-precondition', 'Picks are closed for this gameweek')
    }
  }

  const cacheRef = db.collection('users').doc(uid).collection('gameweek_predictions').doc(gameweekId)
  const cacheSnap = await cacheRef.get()
  const creatingCache = !cacheSnap.exists
  const existingPredictions: Record<string, Pick> = cacheSnap.exists
    ? (cacheSnap.data()?.predictions as Record<string, Pick>) || {}
    : {}

  const mergedPredictions: Record<string, Pick> = { ...existingPredictions }
  for (const [fixtureId, pick] of predictionMap.entries()) {
    mergedPredictions[String(fixtureId)] = pick
  }

  const fixtureIdsToWrite = fixturesNeedingWriteServer({
    creatingCache,
    existingPredictions,
    predictions: predictionMap,
  })

  if (fixtureIdsToWrite.length === 0) {
    return { joinedGameweek: false }
  }

  const entrySnaps = await Promise.all(
    fixtureIdsToWrite.map(async (fixtureId) => {
      const ref = db.collection('predictions').doc(String(fixtureId)).collection('entries').doc(uid)
      return { fixtureId, snap: await ref.get() }
    })
  )
  const entryExistsMap = new Map(entrySnaps.map((e) => [e.fixtureId, e.snap.exists]))

  const firstNewFixtureId =
    creatingCache
      ? firstNewEntryFixtureId(fixtureIdsToWrite, (id) => entryExistsMap.get(id) === true)
      : null

  const now = admin.firestore.FieldValue.serverTimestamp()
  const batch = db.batch()

  for (const fixtureId of fixtureIdsToWrite) {
    const pick = predictionMap.get(fixtureId)!
    const match = matchByFixture.get(fixtureId)
    if (!match) {
      throw new functions.https.HttpsError('invalid-argument', `Missing match data for fixture ${fixtureId}`)
    }

    const parentRef = db.collection('predictions').doc(String(fixtureId))
    const entryRef = parentRef.collection('entries').doc(uid)
    const hadEntry = entryExistsMap.get(fixtureId) === true

    if (hadEntry) {
      batch.set(parentRef, { exists: true }, { merge: true })
    } else {
      batch.set(
        parentRef,
        { exists: true, playerCount: admin.firestore.FieldValue.increment(1) },
        { merge: true }
      )
    }

    const entryData = {
      uid,
      fixtureId,
      gameweekId,
      pick,
      createdAt: now,
      awarded: false,
      points: 0,
      correct: null,
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        logo: match.homeTeam.logo,
      },
      awayTeam: {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        logo: match.awayTeam.logo,
      },
      league: {
        id: match.league.id,
        name: match.league.name,
        country: '',
        logo: match.league.logo || '',
      },
      fixtureDate: admin.firestore.Timestamp.fromMillis(match.fixtureDateMs),
      status: match.matchStatus || 'NS',
      result: match.score
        ? { homeGoals: match.score.home, awayGoals: match.score.away }
        : null,
    }

    batch.set(entryRef, entryData, { merge: true })
  }

  if (creatingCache && firstNewFixtureId != null) {
    batch.set(cacheRef, {
      predictions: mergedPredictions,
      updatedAt: now,
      joinedFixtureId: String(firstNewFixtureId),
    })
    batch.set(
      db.collection('gameweeks').doc(gameweekId),
      { playerCount: admin.firestore.FieldValue.increment(1) },
      { merge: true }
    )
  } else {
    batch.set(cacheRef, {
      predictions: mergedPredictions,
      updatedAt: now,
    })
  }

  await batch.commit()

  return { joinedGameweek: creatingCache }
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
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Failed to save picks'
    )
  }
}