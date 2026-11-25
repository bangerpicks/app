import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { isGameweekWindowOpen, type PlanGameweek } from './save-gameweek-picks-plan'
import { refreshWeeklyStandingsForGameweek } from './standings-update'

function toMillis(value: unknown): number | null {
  if (value && typeof (value as admin.firestore.Timestamp).toMillis === 'function') {
    return (value as admin.firestore.Timestamp).toMillis()
  }
  return null
}

export type LeaveLeagueMode = 'immediate' | 'deferred' | 'purged'

export type LeaveLeagueResult = {
  mode: LeaveLeagueMode
  gameweekId?: string
}

async function loadActiveGameweek(
  db: admin.firestore.Firestore,
  competitionId: string
): Promise<{ gameweekId: string | null; gameweekRef: FirebaseFirestore.DocumentReference | null }> {
  const compSnap = await db.collection('competitions').doc(competitionId).get()
  if (!compSnap.exists) return { gameweekId: null, gameweekRef: null }
  const activeId = compSnap.data()?.activeGameweekId
  if (typeof activeId !== 'string' || !activeId.trim()) {
    return { gameweekId: null, gameweekRef: null }
  }
  const gwRef = db.collection('gameweeks').doc(activeId)
  const gwSnap = await gwRef.get()
  if (!gwSnap.exists) return { gameweekId: activeId, gameweekRef: null }
  return { gameweekId: activeId, gameweekRef: gwRef }
}

async function userHasPicksOnGameweek(
  db: admin.firestore.Firestore,
  uid: string,
  gameweekId: string,
  gameweekRef: FirebaseFirestore.DocumentReference
): Promise<boolean> {
  const cacheSnap = await db
    .collection('users')
    .doc(uid)
    .collection('gameweek_predictions')
    .doc(gameweekId)
    .get()
  if (cacheSnap.exists) {
    const preds = cacheSnap.data()?.predictions
    if (preds && typeof preds === 'object' && Object.keys(preds).length > 0) {
      return true
    }
  }

  const fixtures = await gameweekRef.collection('fixtures').get()
  for (const f of fixtures.docs) {
    const fixtureId =
      typeof f.data().fixtureId === 'number'
        ? f.data().fixtureId
        : Number.parseInt(f.id, 10)
    if (!Number.isInteger(fixtureId) || fixtureId <= 0) continue
    const entrySnap = await db
      .collection('predictions')
      .doc(String(fixtureId))
      .collection('entries')
      .doc(uid)
      .get()
    if (entrySnap.exists) {
      const gwId = entrySnap.data()?.gameweekId
      if (gwId === gameweekId || gwId == null) return true
    }
  }
  return false
}

async function purgeUserPicksForGameweek(
  db: admin.firestore.Firestore,
  uid: string,
  gameweekId: string,
  gameweekRef: FirebaseFirestore.DocumentReference
): Promise<{ hadJoinedGameweek: boolean }> {
  const cacheRef = db.collection('users').doc(uid).collection('gameweek_predictions').doc(gameweekId)
  const cacheSnap = await cacheRef.get()
  const hadJoinedGameweek = cacheSnap.exists

  const fixtures = await gameweekRef.collection('fixtures').get()
  let batch = db.batch()
  let batchOps = 0
  let committedDeletes = 0

  const commitBatch = async () => {
    if (batchOps === 0) return
    await batch.commit()
    batch = db.batch()
    batchOps = 0
  }

  for (const f of fixtures.docs) {
    const fixtureId =
      typeof f.data().fixtureId === 'number'
        ? f.data().fixtureId
        : Number.parseInt(f.id, 10)
    if (!Number.isInteger(fixtureId) || fixtureId <= 0) continue

    const entryRef = db.collection('predictions').doc(String(fixtureId)).collection('entries').doc(uid)
    const entrySnap = await entryRef.get()
    if (!entrySnap.exists) continue
    const entryGw = entrySnap.data()?.gameweekId
    if (entryGw != null && entryGw !== gameweekId) continue

    batch.delete(entryRef)
    const parentRef = db.collection('predictions').doc(String(fixtureId))
    batch.set(
      parentRef,
      { playerCount: admin.firestore.FieldValue.increment(-1) },
      { merge: true }
    )
    batchOps += 2
    committedDeletes++
    if (batchOps >= 400) await commitBatch()
  }

  if (cacheSnap.exists) {
    batch.delete(cacheRef)
    batchOps++
  }

  if (hadJoinedGameweek) {
    batch.set(
      gameweekRef,
      { playerCount: admin.firestore.FieldValue.increment(-1) },
      { merge: true }
    )
    batchOps++
  }

  await commitBatch()

  if (committedDeletes > 0 || hadJoinedGameweek) {
    try {
      await refreshWeeklyStandingsForGameweek(db, gameweekId, Date.now())
    } catch (error) {
      console.warn('[leaveLeague] weeklyStandings refresh failed', error)
    }
  }

  return { hadJoinedGameweek }
}

async function removeMembership(
  db: admin.firestore.Firestore,
  uid: string,
  competitionId: string,
  opts: { dismiss: boolean; deleteDoc: boolean }
): Promise<boolean> {
  const memRef = db.collection('users').doc(uid).collection('competitions').doc(competitionId)
  const memSnap = await memRef.get()
  const hadMembership = memSnap.exists

  const homeRef = db.collection('users').doc(uid).collection('homeMembership').doc('summary')
  const batch = db.batch()

  if (opts.deleteDoc) {
    batch.delete(memRef)
  }

  const homeUpdate: Record<string, unknown> = {
    competitionIds: admin.firestore.FieldValue.arrayRemove(competitionId),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }
  if (opts.dismiss) {
    homeUpdate.dismissedCompetitionIds = admin.firestore.FieldValue.arrayUnion(competitionId)
  }
  batch.set(homeRef, homeUpdate, { merge: true })

  if (hadMembership) {
    batch.set(
      db.collection('competitions').doc(competitionId),
      {
        memberCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  await batch.commit()
  return hadMembership
}

export async function executeLeaveLeague(
  db: admin.firestore.Firestore,
  uid: string,
  competitionId: string,
  nowMs: number = Date.now()
): Promise<LeaveLeagueResult> {
  const compSnap = await db.collection('competitions').doc(competitionId).get()
  if (!compSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Competition not found')
  }
  const comp = compSnap.data() || {}
  if (comp.status !== 'active') {
    throw new functions.https.HttpsError('failed-precondition', 'Competition not active')
  }

  const { gameweekId, gameweekRef } = await loadActiveGameweek(db, competitionId)
  const memRef = db.collection('users').doc(uid).collection('competitions').doc(competitionId)
  const memSnap = await memRef.get()
  if (!memSnap.exists) {
    return { mode: 'immediate' }
  }

  if (!gameweekId || !gameweekRef) {
    await removeMembership(db, uid, competitionId, { dismiss: true, deleteDoc: true })
    return { mode: 'immediate' }
  }

  const gwSnap = await gameweekRef.get()
  const gw = gwSnap.data() || {}
  const planGw: PlanGameweek = {
    status: gw.status as string,
    lockAtMs: toMillis(gw.lockAt) ?? toMillis(gw.deadline),
    forceOpenForTesting: gw.forceOpenForTesting === true,
  }
  const picksOpen = isGameweekWindowOpen(planGw, nowMs)
  const hasPicks = await userHasPicksOnGameweek(db, uid, gameweekId, gameweekRef)

  if (picksOpen) {
    if (hasPicks) {
      await purgeUserPicksForGameweek(db, uid, gameweekId, gameweekRef)
      await removeMembership(db, uid, competitionId, { dismiss: true, deleteDoc: true })
      return { mode: 'purged', gameweekId }
    }
    await removeMembership(db, uid, competitionId, { dismiss: true, deleteDoc: true })
    return { mode: 'immediate', gameweekId }
  }

  if (hasPicks && (gw.status === 'active' || gw.status === 'completed')) {
    if (gw.status === 'completed') {
      await removeMembership(db, uid, competitionId, { dismiss: true, deleteDoc: true })
      return { mode: 'immediate', gameweekId }
    }
    await memRef.set(
      {
        competitionId,
        role: memSnap.data()?.role || 'member',
        joinedAt: memSnap.data()?.joinedAt || admin.firestore.FieldValue.serverTimestamp(),
        joinedVia: memSnap.data()?.joinedVia,
        pendingLeaveGameweekId: gameweekId,
      },
      { merge: true }
    )
    return { mode: 'deferred', gameweekId }
  }

  await removeMembership(db, uid, competitionId, { dismiss: true, deleteDoc: true })
  return { mode: 'immediate', gameweekId }
}

export const leaveLeagueHandler = async (
  data: { competitionId?: string },
  context: functions.https.CallableContext
): Promise<LeaveLeagueResult> => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
  }
  const competitionId =
    typeof data?.competitionId === 'string' ? data.competitionId.trim() : ''
  if (!competitionId || !/^[A-Za-z0-9_-]{1,80}$/.test(competitionId)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid competitionId')
  }
  const db = admin.firestore()
  try {
    return await executeLeaveLeague(db, context.auth.uid, competitionId)
  } catch (error: unknown) {
    if (error instanceof functions.https.HttpsError) throw error
    console.error('[leaveLeague] Error:', error)
    throw new functions.https.HttpsError('internal', 'Failed to leave league')
  }
}
