/**
 * Weekly rankings utility functions
 * Handles fetching and calculating weekly rankings for gameweeks
 */

import { collection, doc, type QuerySnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { getGameweekById, AdminGameweekData, GameweekFixtureData } from './admin'
import { getGameweekPlayerCount } from './predictions'
import {
  fetchCurrentGameweek,
  getEffectiveDeadline,
  mapAdminGameweekToDashboardStatus,
  resolvePlayerCountFromGameweek,
  LoadBudget,
} from './gameweek-selection'
import {
  getDocSnapshotServerPreferring,
  getQuerySnapshotServerPreferring,
  markServedFromCacheRef,
} from './firestore-server-read'
import {
  coalesceProfilePhotoUrl,
  normalizeProfilePhotoUrl,
} from './profile-photo.mjs'
import { mergeWeeklyRankingsWithStandings } from './weekly-rankings-merge.mjs'
import { matchPredictionsFromStandingsPicks } from './weekly-standings-picks.mjs'
import { mapWithConcurrency } from './rankings-concurrency'
import { rankingsHungReadGate } from './rankings-load-state.mjs'

export const RANKINGS_ENTRIES_CONCURRENCY = 4
export const RANKINGS_USER_DOC_CONCURRENCY = 4

export type RankingsFirestoreReadOptions = {
  budget: LoadBudget
  servedFromCacheRef?: { current: boolean }
}

export type WeeklyRankingsLoadContext = {
  gameweek: AdminGameweekData
  fixtures: Array<{
    fixtureId: number
    homeTeam: TeamInfo
    awayTeam: TeamInfo
  }>
  readOptions: RankingsFirestoreReadOptions
  /** Pre-fetched weeklyStandings rows (optional). */
  precomputedStandings?: RankingEntry[] | null
}
import {
  RankingEntry,
  GameweekData,
  GameweekRankingData,
  MatchPrediction,
  TeamInfo,
} from '@/types/dashboard'

/** @deprecated Import fetchCurrentGameweek from gameweek-selection (same behavior). */
export async function getCurrentGameweek(): Promise<AdminGameweekData | null> {
  try {
    return await fetchCurrentGameweek()
  } catch {
    return null
  }
}

/**
 * Fetch fixture details from gameweek subcollection
 * 
 * @param gameweekId - Gameweek ID
 * @returns Promise<Array of fixture data with TeamInfo>
 */
function mapFixtureDocsToDetails(
  fixturesSnapshot: QuerySnapshot
): Array<{
  fixtureId: number
  homeTeam: TeamInfo
  awayTeam: TeamInfo
}> {
  if (fixturesSnapshot.empty) {
    return []
  }

    const fixturesWithSortKey: Array<{
      fixtureId: number
      homeTeam: TeamInfo
      awayTeam: TeamInfo
      _sortKey: number
    }> = []

    fixturesSnapshot.forEach((docSnap) => {
      const data = docSnap.data() as GameweekFixtureData
      const fixtureId = data.fixtureId || parseInt(docSnap.id, 10)

      if (data.teams && data.teams.home && data.teams.away) {
        // Extract date for sorting - data.fixture is the full APIFootballFixture
        const apiFixture = (data.fixture as { fixture?: { date?: string; timestamp?: number } } | null)?.fixture
        const dateStr = apiFixture?.date
        const dateTs = apiFixture?.timestamp
        const sortKey = dateStr
          ? new Date(dateStr).getTime()
          : dateTs
            ? dateTs * 1000
            : fixtureId // Fallback for legacy docs without date

        fixturesWithSortKey.push({
          fixtureId,
          homeTeam: {
            id: data.teams.home.id,
            name: data.teams.home.name,
            logo: data.teams.home.logo || '',
            position: 0, // Position not available in fixture data
            form: [], // Form data not available in fixture data
          },
          awayTeam: {
            id: data.teams.away.id,
            name: data.teams.away.name,
            logo: data.teams.away.logo || '',
            position: 0, // Position not available in fixture data
            form: [], // Form data not available in fixture data
          },
          _sortKey: sortKey,
        })
      }
    })

    // Sort by game time (first game left), fallback to fixtureId for same times
    fixturesWithSortKey.sort((a, b) => {
      const diff = a._sortKey - b._sortKey
      return diff !== 0 ? diff : a.fixtureId - b.fixtureId
    })

  return fixturesWithSortKey.map(({ _sortKey, ...fixture }) => fixture)
}

export async function getGameweekFixtureDetails(
  gameweekId: string,
  readOptions: RankingsFirestoreReadOptions
): Promise<
  Array<{
    fixtureId: number
    homeTeam: TeamInfo
    awayTeam: TeamInfo
  }>
> {
  await rankingsHungReadGate('fixtures', {
    budgetRemainingMs: readOptions.budget.remaining(),
  })
  const fixturesRef = collection(db, 'gameweeks', gameweekId, 'fixtures')
  const timeoutMessage = 'Failed to load gameweek fixtures'
  const result = await getQuerySnapshotServerPreferring(fixturesRef, {
    budget: readOptions.budget,
    timeoutMessage,
  })
  markServedFromCacheRef(readOptions.servedFromCacheRef, result)
  return mapFixtureDocsToDetails(result.data)
}

/**
 * Transform AdminGameweekData to GameweekData and GameweekRankingData
 * 
 * @param adminGameweek - Admin gameweek data
 * @param fixtures - Array of fixture data
 * @returns Promise<GameweekRankingData>
 */
export async function transformGameweekData(
  adminGameweek: AdminGameweekData,
  fixtures: Array<{
    fixtureId: number
    homeTeam: TeamInfo
    awayTeam: TeamInfo
  }>
): Promise<GameweekRankingData> {
  const dashboardStatus = mapAdminGameweekToDashboardStatus(adminGameweek)

  const storedCount = resolvePlayerCountFromGameweek(adminGameweek)
  const playerCount =
    storedCount !== undefined
      ? storedCount
      : await getGameweekPlayerCount(adminGameweek.fixtureIds, adminGameweek.gameweekId)

  // Transform to GameweekData
  const gameweekData: GameweekData = {
    gameweekId: adminGameweek.gameweekId,
    name: adminGameweek.name,
    playerCount,
    status: dashboardStatus,
    deadline:
      adminGameweek.lockAt?.toDate() ?? adminGameweek.deadline?.toDate(),
    startDate: adminGameweek.startDate?.toDate(),
    endDate: adminGameweek.endDate?.toDate(),
    forceOpenForTesting: adminGameweek.forceOpenForTesting,
    type: adminGameweek.type,
    description: adminGameweek.description,
    weekNumber: adminGameweek.weekNumber,
  }

  // Transform fixtures to match GameweekRankingData structure
  const transformedFixtures = fixtures.map((fixture) => ({
    fixtureId: fixture.fixtureId,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  }))

  return {
    gameweek: gameweekData,
    fixtures: transformedFixtures,
  }
}


interface BatchUserData {
  displayName: string
  points: number
  photoURL?: string | null
  lastWeekPlace?: 1 | 2 | 3 | null
  lastCompletedGameweekId?: string | null
}

/**
 * Batch fetch user documents from Firestore in parallel
 * Fetches all user documents concurrently to avoid N+1 query problem
 *
 * @param userIds - Array of user IDs to fetch
 * @returns Promise<Map<userId, BatchUserData>>
 */
async function fetchSingleUser(
  userId: string,
  readOptions: RankingsFirestoreReadOptions
): Promise<{ userId: string } & BatchUserData> {
  await rankingsHungReadGate('users', {
    budgetRemainingMs: readOptions.budget.remaining(),
  })
  const userRef = doc(db, 'users', userId)
  const result = await getDocSnapshotServerPreferring(userRef, {
    budget: readOptions.budget,
    timeoutMessage: `Failed to load user ${userId}`,
  })
  markServedFromCacheRef(readOptions.servedFromCacheRef, result)
  const userDoc = result.data
  if (userDoc.exists()) {
    const data = userDoc.data()
    const photoURL = coalesceProfilePhotoUrl(
      data.favoritePlayer?.photo,
      data.photoURL
    )
    return {
      userId,
      displayName: data.displayName || 'Player',
      points: data.points || 0,
      photoURL,
      lastWeekPlace: data.lastWeekPlace ?? null,
      lastCompletedGameweekId: data.lastCompletedGameweekId ?? null,
    }
  }
  return {
    userId,
    displayName: 'Player',
    points: 0,
    photoURL: null,
    lastWeekPlace: null,
    lastCompletedGameweekId: null,
  }
}

async function batchFetchUsers(
  userIds: string[],
  readOptions: RankingsFirestoreReadOptions
): Promise<Map<string, BatchUserData>> {
  const userDataMap = new Map<string, BatchUserData>()
  if (userIds.length === 0) {
    return userDataMap
  }
  const results = await mapWithConcurrency(
    userIds,
    RANKINGS_USER_DOC_CONCURRENCY,
    (userId) => fetchSingleUser(userId, readOptions)
  )
  results.forEach(
    ({ userId, displayName, points, photoURL, lastWeekPlace, lastCompletedGameweekId }) => {
      userDataMap.set(userId, {
        displayName,
        points,
        photoURL: photoURL ?? null,
        lastWeekPlace: lastWeekPlace ?? null,
        lastCompletedGameweekId: lastCompletedGameweekId ?? null,
      })
    }
  )
  return userDataMap
}

function buildUserDataFromStandings(
  standings: RankingEntry[] | null | undefined
): Map<string, BatchUserData> {
  const map = new Map<string, BatchUserData>()
  if (!standings) return map
  for (const row of standings) {
    map.set(row.userId, {
      displayName: row.displayName || 'Player',
      points: row.points || 0,
      photoURL: normalizeProfilePhotoUrl(row.photoURL),
      lastWeekPlace: row.lastWeekPlace ?? null,
      lastCompletedGameweekId: row.lastCompletedGameweekId ?? null,
    })
  }
  return map
}


function buildWeeklyRankingsFromPrecomputedStandings(
  standingsRows: RankingEntry[],
  userDataMap: Map<string, BatchUserData>,
  currentUserId?: string | null
): RankingEntry[] {
  return standingsRows.map((row) => {
    const userData = userDataMap.get(row.userId)
    return {
      userId: row.userId,
      displayName: userData?.displayName ?? row.displayName ?? 'Player',
      points: userData?.points ?? row.points ?? 0,
      rank: row.rank ?? 0,
      weeklyPoints: row.weeklyPoints ?? row.points ?? 0,
      matchPredictions: [],
      photoURL: userData?.photoURL ?? row.photoURL ?? null,
      isCurrentUser: currentUserId ? row.userId === currentUserId : false,
      lastWeekPlace: userData?.lastWeekPlace ?? row.lastWeekPlace ?? null,
      lastCompletedGameweekId:
        userData?.lastCompletedGameweekId ?? row.lastCompletedGameweekId ?? null,
    }
  })
}

export async function getWeeklyRankings(
  gameweekId: string,
  currentUserId?: string | null,
  context?: WeeklyRankingsLoadContext
): Promise<RankingEntry[]> {
  const gameweek = context?.gameweek ?? (await getGameweekById(gameweekId))
  if (!gameweek) {
    throw new Error(`Gameweek not found: ${gameweekId}`)
  }
  const readOptions = context?.readOptions
  if (!readOptions) {
    throw new Error('getWeeklyRankings requires server-preferring readOptions')
  }

  const fixtureIds = gameweek.fixtureIds || []
  if (fixtureIds.length === 0) {
    return []
  }

  const standingsRows = context?.precomputedStandings
  // v1.2.11: Rankings never lists predictions entries (the rules deny entry lists).
  // weeklyStandings/{gw} is written by Functions for every active and finished round;
  // until the first build lands, the board is simply empty.
  if (!standingsRows || standingsRows.length === 0) {
    return []
  }

  const standingsUserData = buildUserDataFromStandings(standingsRows)
  const userIds = standingsRows.map((r) => r.userId)
  const photoOverlay = await batchFetchUsers(userIds, readOptions)
  for (const uid of userIds) {
    const row = standingsUserData.get(uid)
    const fresh = photoOverlay.get(uid)
    if (!row || !fresh) continue
    const photo = coalesceProfilePhotoUrl(fresh.photoURL, row.photoURL)
    if (photo) row.photoURL = photo
  }
  const entries = buildWeeklyRankingsFromPrecomputedStandings(
    standingsRows,
    standingsUserData,
    currentUserId
  )

  const anyPicks = standingsRows.some((r) => r.standingsPicks)
  if (!anyPicks) {
    return entries
  }

  const fixtureDetails =
    context?.fixtures ?? (await getGameweekFixtureDetails(gameweekId, readOptions))
  const fixtureDetailsMap = new Map<number, { homeTeam: TeamInfo; awayTeam: TeamInfo }>()
  fixtureDetails.forEach((fixture) => {
    fixtureDetailsMap.set(fixture.fixtureId, {
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
    })
  })
  const picksByUid = new Map(standingsRows.map((r) => [r.userId, r.standingsPicks ?? null]))
  return entries.map((entry) => ({
    ...entry,
    matchPredictions: matchPredictionsFromStandingsPicks(
      fixtureIds,
      fixtureDetailsMap,
      picksByUid.get(entry.userId)
    ) as MatchPrediction[],
  }))
}

/**
 * Fill missing table avatars from users/{uid} (favorite player + photoURL).
 * weeklyStandings snapshots often only store auth photoURL.
 */
export async function enrichRankingEntriesWithProfilePhotos(
  entries: RankingEntry[],
  readOptions: RankingsFirestoreReadOptions
): Promise<RankingEntry[]> {
  const missingUids = entries
    .filter((e) => !normalizeProfilePhotoUrl(e.photoURL))
    .map((e) => e.userId)
  if (missingUids.length === 0) {
    return entries
  }

  const uniqueMissing = [...new Set(missingUids)]
  const photoByUid = await batchFetchUsers(uniqueMissing, readOptions)

  return entries.map((entry) => {
    if (normalizeProfilePhotoUrl(entry.photoURL)) {
      return entry
    }
    const fresh = photoByUid.get(entry.userId)
    const photo = coalesceProfilePhotoUrl(fresh?.photoURL)
    if (!photo) return entry
    return { ...entry, photoURL: photo }
  })
}

export async function mergeWeeklyRankingsForTable(
  standingsRows: RankingEntry[] | null | undefined,
  liveRows: RankingEntry[],
  readOptions: RankingsFirestoreReadOptions
): Promise<RankingEntry[]> {
  const merged = mergeWeeklyRankingsWithStandings(
    standingsRows,
    liveRows
  ) as unknown as RankingEntry[]
  return enrichRankingEntriesWithProfilePhotos(merged, readOptions)
}
