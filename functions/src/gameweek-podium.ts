import * as admin from 'firebase-admin'

/** Weekly placement bonus multipliers */
export const BONUS_MULTIPLIERS = [0.5, 0.3, 0.2] as const

export interface PodiumEntry {
  uid: string
  rank: 1 | 2 | 3
  weeklyPoints: number
}

export interface PodiumAwardTx {
  get(ref: admin.firestore.DocumentReference): Promise<admin.firestore.DocumentSnapshot>
  update(ref: admin.firestore.DocumentReference, data: Record<string, unknown>): void
}

export function buildWeeklyPointsByUid(
  entrySnapshots: Array<Array<{ uid: string; awarded?: boolean; points?: number }>>
): Map<string, number> {
  const weeklyPointsByUid = new Map<string, number>()

  for (const entries of entrySnapshots) {
    for (const data of entries) {
      const uid = data.uid
      if (data.awarded === true && typeof data.points === 'number') {
        weeklyPointsByUid.set(uid, (weeklyPointsByUid.get(uid) || 0) + data.points)
      }
    }
  }

  return weeklyPointsByUid
}

export function rankPodiumFromWeeklyPoints(
  weeklyPointsByUid: Map<string, number>
): PodiumEntry[] {
  const entries: { uid: string; weeklyPoints: number }[] = []
  weeklyPointsByUid.forEach((weeklyPoints, uid) => {
    entries.push({ uid, weeklyPoints })
  })
  entries.sort((a, b) => b.weeklyPoints - a.weeklyPoints)

  let currentRank = 1
  let previousPoints: number | null = null
  let usersAtCurrentRank = 0
  const rankByUid = new Map<string, number>()

  for (const { uid, weeklyPoints } of entries) {
    if (previousPoints === null) {
      currentRank = 1
      usersAtCurrentRank = 1
    } else if (weeklyPoints < previousPoints) {
      currentRank += usersAtCurrentRank
      usersAtCurrentRank = 1
    } else {
      usersAtCurrentRank++
    }
    rankByUid.set(uid, currentRank)
    previousPoints = weeklyPoints
  }

  const podium: PodiumEntry[] = []
  for (const { uid, weeklyPoints } of entries) {
    const rank = rankByUid.get(uid)
    if (rank === 1 || rank === 2 || rank === 3) {
      podium.push({ uid, rank: rank as 1 | 2 | 3, weeklyPoints })
    }
  }

  return podium
}

export function userUpdatesForPodiumPlace(
  gameweekId: string,
  uid: string,
  rank: 1 | 2 | 3,
  weeklyPoints: number
): Record<string, unknown> {
  const bonusFraction = BONUS_MULTIPLIERS[rank - 1]
  const bonus = Math.round(weeklyPoints * bonusFraction)

  const updates: Record<string, unknown> = {
    points: admin.firestore.FieldValue.increment(bonus),
    lastWeekPlace: rank,
    lastCompletedGameweekId: gameweekId,
  }
  if (rank === 1) {
    updates.weekWins1st = admin.firestore.FieldValue.increment(1)
  } else if (rank === 2) {
    updates.weekWins2nd = admin.firestore.FieldValue.increment(1)
  } else {
    updates.weekWins3rd = admin.firestore.FieldValue.increment(1)
  }
  return updates
}

export type PodiumAwardOutcome = 'skipped-already-awarded' | 'awarded' | 'missing-gameweek'

/**
 * Idempotent podium payout: reads gameweek in txn; if podiumAwardedAt is set, no-op.
 * Otherwise applies all user increments and sets podiumAwardedAt in the same transaction.
 */
export async function applyPodiumAwardInTransaction(
  tx: PodiumAwardTx,
  gameweekRef: admin.firestore.DocumentReference,
  gameweekId: string,
  podium: PodiumEntry[]
): Promise<PodiumAwardOutcome> {
  const snap = await tx.get(gameweekRef)
  if (!snap.exists) {
    return 'missing-gameweek'
  }

  if (snap.data()?.podiumAwardedAt != null) {
    return 'skipped-already-awarded'
  }

  const db = gameweekRef.firestore
  for (const { uid, rank, weeklyPoints } of podium) {
    const userRef = db.collection('users').doc(uid)
    tx.update(userRef, userUpdatesForPodiumPlace(gameweekId, uid, rank, weeklyPoints))
  }

  tx.update(gameweekRef, {
    podiumAwardedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return 'awarded'
}
