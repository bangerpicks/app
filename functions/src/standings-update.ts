import * as admin from 'firebase-admin'
import { buildWeeklyPointsByUid } from './gameweek-podium'
import {
  assignTiedRanks,
  compareSeasonStandingRows,
  pickCountingWeekIds,
  shouldAppendGameweekToSeason,
  sumBestN,
} from './season-standings-logic'

export interface WeeklyStandingsEntry {
  uid: string
  displayName: string
  photoURL: string | null
  points: number
  correct: number
  rank: number
  isBot?: boolean
}

export interface SeasonStandingsEntry {
  uid: string
  displayName: string
  photoURL: string | null
  seasonPoints: number
  totalCorrect: number
  rank: number
  countingWeekIds: string[]
  isBot?: boolean
}

interface AggregatedPlayer {
  uid: string
  weeklyPoints: number
  weeklyCorrect: number
  displayName: string
  photoURL: string | null
  isBot: boolean
  joinMs: number
  rank?: number
}

async function loadUserSnapshots(
  db: admin.firestore.Firestore,
  uids: string[]
): Promise<Map<string, admin.firestore.DocumentSnapshot>> {
  const map = new Map<string, admin.firestore.DocumentSnapshot>()
  const chunks: string[][] = []
  for (let i = 0; i < uids.length; i += 30) {
    chunks.push(uids.slice(i, i + 30))
  }
  for (const chunk of chunks) {
    const refs = chunk.map((uid) => db.collection('users').doc(uid))
    const snaps = await db.getAll(...refs)
    snaps.forEach((snap) => map.set(snap.id, snap))
  }
  return map
}

function userIsBot(uid: string, data: FirebaseFirestore.DocumentData | undefined): boolean {
  if (uid.startsWith('bot-')) {
    return true
  }
  return data?.isBot === true
}

/**
 * Build weekly leaderboard rows for one gameweek (all players with picks).
 */
export async function buildWeeklyStandingsEntries(
  db: admin.firestore.Firestore,
  gameweekId: string,
  fixtureIds: number[]
): Promise<WeeklyStandingsEntry[]> {
  const entryGroups: Array<Array<{ uid: string; awarded?: boolean; points?: number; correct?: boolean }>> = []
  const correctByUid = new Map<string, number>()

  for (const fixtureId of fixtureIds) {
    const entriesSnapshot = await db
      .collection('predictions')
      .doc(String(fixtureId))
      .collection('entries')
      .get()

    const group: Array<{ uid: string; awarded?: boolean; points?: number; correct?: boolean }> = []
    entriesSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data()
      const uid = (data.uid || docSnap.id) as string
      group.push({
        uid,
        awarded: data.awarded,
        points: data.points,
        correct: data.correct,
      })
      if (data.awarded === true && data.correct === true) {
        correctByUid.set(uid, (correctByUid.get(uid) || 0) + 1)
      }
    })
    entryGroups.push(group)
  }

  const weeklyPointsByUid = buildWeeklyPointsByUid(entryGroups)
  const uids = Array.from(weeklyPointsByUid.keys())
  if (uids.length === 0) {
    return []
  }

  const userSnaps = await loadUserSnapshots(db, uids)
  const rows: AggregatedPlayer[] = []

  weeklyPointsByUid.forEach((weeklyPoints, uid) => {
    const snap = userSnaps.get(uid)
    const data = snap?.data()
    const createdAt = data?.createdAt
    const joinMs =
      createdAt && typeof createdAt.toMillis === 'function' ? createdAt.toMillis() : Number.MAX_SAFE_INTEGER

    rows.push({
      uid,
      weeklyPoints,
      weeklyCorrect: correctByUid.get(uid) || 0,
      displayName: (data?.displayName as string) || 'Player',
      photoURL: (data?.photoURL as string | null | undefined) ?? null,
      isBot: userIsBot(uid, data),
      joinMs,
    })
  })

  rows.sort((a, b) => {
    if (b.weeklyPoints !== a.weeklyPoints) {
      return b.weeklyPoints - a.weeklyPoints
    }
    return a.joinMs - b.joinMs
  })

  const ranked = assignTiedRanks(rows, (r) => r.weeklyPoints)

  return ranked.map((row) => ({
    uid: row.uid,
    displayName: row.displayName,
    photoURL: row.photoURL,
    points: row.weeklyPoints,
    correct: row.weeklyCorrect,
    rank: row.rank ?? 0,
    isBot: row.isBot,
  }))
}

export async function writeWeeklyStandings(
  db: admin.firestore.Firestore,
  gameweekId: string,
  entries: WeeklyStandingsEntry[]
): Promise<void> {
  const ref = db.collection('weeklyStandings').doc(gameweekId)
  await ref.set(
    {
      gameweekId,
      entries,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

export async function refreshWeeklyStandingsForGameweek(
  db: admin.firestore.Firestore,
  gameweekId: string
): Promise<WeeklyStandingsEntry[]> {
  const gameweekSnap = await db.collection('gameweeks').doc(gameweekId).get()
  if (!gameweekSnap.exists) {
    return []
  }
  const fixtureIds: number[] = gameweekSnap.data()?.fixtureIds || []
  if (fixtureIds.length === 0) {
    return []
  }
  const entries = await buildWeeklyStandingsEntries(db, gameweekId, fixtureIds)
  await writeWeeklyStandings(db, gameweekId, entries)
  return entries
}

export async function recomputeSeasonStandings(
  db: admin.firestore.Firestore,
  seasonId: string
): Promise<SeasonStandingsEntry[]> {
  const seasonSnap = await db.collection('seasons').doc(seasonId).get()
  if (!seasonSnap.exists) {
    return []
  }
  const season = seasonSnap.data() || {}
  let gameweekIds: string[] = Array.isArray(season.gameweekIds) ? season.gameweekIds : []
  const seasonCompetitionId =
    typeof season.competitionId === 'string' ? season.competitionId : undefined
  if (seasonCompetitionId) {
    const scoped: string[] = []
    for (const gameweekId of gameweekIds) {
      const gwSnap = await db.collection('gameweeks').doc(gameweekId).get()
      const gwCompetitionId = gwSnap.data()?.competitionId as string | undefined
      const effective =
        gwCompetitionId ||
        (gwSnap.data()?.type === 'league' || gwSnap.data()?.type === 'cup'
          ? undefined
          : 'banger-world')
      if (effective === seasonCompetitionId) {
        scoped.push(gameweekId)
      }
    }
    gameweekIds = scoped
  }
  const bestN = typeof season.bestN === 'number' ? season.bestN : 3

  const perUser = new Map<
    string,
    {
      weekRows: Array<{ gameweekId: string; points: number; correct: number }>
      displayName: string
      photoURL: string | null
      isBot: boolean
      joinMs: number
    }
  >()

  for (const gameweekId of gameweekIds) {
    const standingsSnap = await db.collection('weeklyStandings').doc(gameweekId).get()
    let entries: WeeklyStandingsEntry[] = []
    if (standingsSnap.exists && Array.isArray(standingsSnap.data()?.entries)) {
      entries = standingsSnap.data()!.entries as WeeklyStandingsEntry[]
    } else {
      entries = await refreshWeeklyStandingsForGameweek(db, gameweekId)
    }

    for (const entry of entries) {
      if (!perUser.has(entry.uid)) {
        const userSnap = await db.collection('users').doc(entry.uid).get()
        const data = userSnap.data()
        const createdAt = data?.createdAt
        const joinMs =
          createdAt && typeof createdAt.toMillis === 'function'
            ? createdAt.toMillis()
            : Number.MAX_SAFE_INTEGER
        perUser.set(entry.uid, {
          weekRows: [],
          displayName: entry.displayName || (data?.displayName as string) || 'Player',
          photoURL: entry.photoURL ?? (data?.photoURL as string | null) ?? null,
          isBot: entry.isBot === true || userIsBot(entry.uid, data),
          joinMs,
        })
      }
      const row = perUser.get(entry.uid)!
      row.weekRows.push({
        gameweekId,
        points: entry.points,
        correct: entry.correct,
      })
    }
  }

  const seasonRows: Array<
    SeasonStandingsEntry & { joinMs: number }
  > = []

  perUser.forEach((agg, uid) => {
    const weekScores = agg.weekRows.map((w) => w.points)
    const seasonPoints = sumBestN(weekScores, bestN)
    const countingWeekIds = pickCountingWeekIds(agg.weekRows, bestN)
    const totalCorrect = agg.weekRows.reduce((sum, w) => sum + w.correct, 0)

    seasonRows.push({
      uid,
      displayName: agg.displayName,
      photoURL: agg.photoURL,
      seasonPoints,
      totalCorrect,
      rank: 0,
      countingWeekIds,
      isBot: agg.isBot,
      joinMs: agg.joinMs,
    })
  })

  seasonRows.sort(compareSeasonStandingRows)
  assignTiedRanks(seasonRows, (r) => r.seasonPoints)

  const entries: SeasonStandingsEntry[] = seasonRows.map(
    ({ joinMs: _joinMs, ...rest }) => rest
  )

  await db.collection('seasonStandings').doc(seasonId).set(
    {
      seasonId,
      bestN,
      entries,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return entries
}

export async function refreshStandingsAfterGameweekActivity(
  db: admin.firestore.Firestore,
  gameweekId: string
): Promise<void> {
  await refreshWeeklyStandingsForGameweek(db, gameweekId)
  const gameweekSnap = await db.collection('gameweeks').doc(gameweekId).get()
  const seasonId = gameweekSnap.data()?.seasonId as string | undefined
  if (seasonId) {
    await recomputeSeasonStandings(db, seasonId)
  }
}

export async function assignGameweekToActiveSeason(
  db: admin.firestore.Firestore,
  gameweekId: string,
  gameweekData: FirebaseFirestore.DocumentData
): Promise<void> {
  const activeSeasons = await db.collection('seasons').where('status', '==', 'active').limit(1).get()
  if (activeSeasons.empty) {
    return
  }
  const seasonDoc = activeSeasons.docs[0]
  const seasonId = seasonDoc.id
  const season = seasonDoc.data()

  const gameweekRef = db.collection('gameweeks').doc(gameweekId)
  const updates: Record<string, unknown> = {}
  if (!gameweekData.seasonId) {
    updates.seasonId = seasonId
  }
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp()
    await gameweekRef.set(updates, { merge: true })
  }

  if (shouldAppendGameweekToSeason(season, gameweekId)) {
    await seasonDoc.ref.set(
      {
        gameweekIds: admin.firestore.FieldValue.arrayUnion(gameweekId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }
}