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
  /** Only present once picks are public (after lock, D3): fixtureId -> { p: pick, c: correct } */
  picks?: Record<string, { p: string; c: boolean | null }>
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
  fixtureIds: number[],
  options: { includePicks?: boolean } = {}
): Promise<WeeklyStandingsEntry[]> {
  const entryGroups: Array<Array<{ uid: string; awarded?: boolean; points?: number; correct?: boolean }>> = []
  const correctByUid = new Map<string, number>()
  const picksByUid = new Map<string, Record<string, { p: string; c: boolean | null }>>()

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
      if (options.includePicks && (data.pick === 'H' || data.pick === 'D' || data.pick === 'A')) {
        const picks = picksByUid.get(uid) || {}
        picks[String(fixtureId)] = {
          p: data.pick,
          c: data.awarded === true && typeof data.correct === 'boolean' ? data.correct : null,
        }
        picksByUid.set(uid, picks)
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
      photoURL:
        (typeof data?.favoritePlayer === 'object' &&
        data?.favoritePlayer !== null &&
        typeof (data.favoritePlayer as { photo?: string }).photo === 'string' &&
        (data.favoritePlayer as { photo: string }).photo.trim()) ||
        (typeof data?.photoURL === 'string' && data.photoURL.trim()) ||
        null,
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
    ...(options.includePicks ? { picks: picksByUid.get(row.uid) || {} } : {}),
  }))
}

export async function writeWeeklyStandings(
  db: admin.firestore.Firestore,
  gameweekId: string,
  entries: WeeklyStandingsEntry[],
  meta: { picksVisible?: boolean } = {}
): Promise<void> {
  const ref = db.collection('weeklyStandings').doc(gameweekId)
  await ref.set(
    {
      gameweekId,
      entries,
      picksVisible: meta.picksVisible === true,
      builtAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

function timestampMs(value: unknown): number | null {
  if (value && typeof (value as admin.firestore.Timestamp).toMillis === 'function') {
    return (value as admin.firestore.Timestamp).toMillis()
  }
  return null
}

/**
 * Picks become public once the round locks (D3), or when it is finished.
 * forceOpenForTesting rounds keep picks private while they can still change.
 */
export function weeklyPicksVisible(
  gameweek: { status?: string; lockAt?: unknown; deadline?: unknown; forceOpenForTesting?: boolean },
  nowMs: number
): boolean {
  if (gameweek.status === 'completed' || gameweek.status === 'archived') return true
  if (gameweek.forceOpenForTesting === true) return false
  const lockMs = timestampMs(gameweek.lockAt) ?? timestampMs(gameweek.deadline)
  return lockMs != null && nowMs >= lockMs
}

/**
 * Whether the scheduled pass should rebuild weeklyStandings/{gw}.
 * Rebuild when missing, when a save marked it dirty after the last build, or when
 * the round just locked (so picks become visible).
 */
export function weeklyStandingsNeedsRefresh(params: {
  exists: boolean
  builtAtMs: number | null
  dirtyAtMs: number | null
  picksVisibleNow: boolean
  docPicksVisible: boolean
}): boolean {
  if (!params.exists || params.builtAtMs == null) return true
  if (params.picksVisibleNow && !params.docPicksVisible) return true
  if (params.dirtyAtMs != null && params.dirtyAtMs > params.builtAtMs) return true
  return false
}

export async function refreshWeeklyStandingsForGameweek(
  db: admin.firestore.Firestore,
  gameweekId: string,
  nowMs: number = Date.now()
): Promise<WeeklyStandingsEntry[]> {
  const gameweekSnap = await db.collection('gameweeks').doc(gameweekId).get()
  if (!gameweekSnap.exists) {
    return []
  }
  const gw = gameweekSnap.data() || {}
  const fixtureIds: number[] = gw.fixtureIds || []
  if (fixtureIds.length === 0) {
    return []
  }
  const picksVisible = weeklyPicksVisible(gw, nowMs)
  const entries = await buildWeeklyStandingsEntries(db, gameweekId, fixtureIds, {
    includePicks: picksVisible,
  })
  await writeWeeklyStandings(db, gameweekId, entries, { picksVisible })
  return entries
}

/**
 * v1.2.11: keep weeklyStandings current for every active round, so Rankings reads one
 * doc instead of listing entries (entry lists are denied by the rules).
 * Returns the ids it rebuilt.
 */
export async function refreshStaleActiveWeeklyStandings(
  db: admin.firestore.Firestore,
  gameweekDocs: Array<{ id: string; data: () => FirebaseFirestore.DocumentData }>,
  nowMs: number = Date.now()
): Promise<string[]> {
  if (gameweekDocs.length === 0) return []
  const refs = gameweekDocs.map((g) => db.collection('weeklyStandings').doc(g.id))
  const snaps = await db.getAll(...refs)
  const rebuilt: string[] = []
  for (let i = 0; i < gameweekDocs.length; i++) {
    const gwDoc = gameweekDocs[i]
    const snap = snaps[i]
    const data = snap.exists ? snap.data() || {} : {}
    const needs = weeklyStandingsNeedsRefresh({
      exists: snap.exists && Array.isArray(data.entries),
      builtAtMs: timestampMs(data.builtAt) ?? timestampMs(data.updatedAt),
      dirtyAtMs: timestampMs(data.dirtyAt),
      picksVisibleNow: weeklyPicksVisible(gwDoc.data(), nowMs),
      docPicksVisible: data.picksVisible === true,
    })
    if (!needs) continue
    try {
      await refreshWeeklyStandingsForGameweek(db, gwDoc.id, nowMs)
      rebuilt.push(gwDoc.id)
    } catch (error) {
      console.error(`[weeklyStandings] refresh failed for ${gwDoc.id}:`, error)
    }
  }
  return rebuilt
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