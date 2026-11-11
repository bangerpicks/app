/**
 * Weekly rankings utility functions
 * Handles fetching and calculating weekly rankings for gameweeks
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { getGameweekById, AdminGameweekData, GameweekFixtureData } from './admin'
import { getGameweekPlayerCount } from './predictions'
import { withTimeout } from './firestore-utils'
import {
  fetchCurrentGameweek,
  mapAdminGameweekToDashboardStatus,
  resolvePlayerCountFromGameweek,
} from './gameweek-selection'
import {
  RankingEntry,
  GameweekData,
  GameweekRankingData,
  MatchPrediction,
  TeamInfo,
} from '@/types/dashboard'
import { PredictionEntry } from './predictions'

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
export async function getGameweekFixtureDetails(
  gameweekId: string
): Promise<
  Array<{
    fixtureId: number
    homeTeam: TeamInfo
    awayTeam: TeamInfo
  }>
> {
  try {
    const fixturesRef = collection(db, 'gameweeks', gameweekId, 'fixtures')
    const fixturesSnapshot = await withTimeout(
      getDocs(fixturesRef),
      10000,
      'Failed to load gameweek fixtures - request timed out'
    )

    if (fixturesSnapshot.empty) {
      return []
    }

    const fixturesWithSortKey: Array<{
      fixtureId: number
      homeTeam: TeamInfo
      awayTeam: TeamInfo
      _sortKey: number
    }> = []

    fixturesSnapshot.forEach((doc) => {
      const data = doc.data() as GameweekFixtureData
      const fixtureId = data.fixtureId || parseInt(doc.id, 10)

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
  } catch (error) {
    console.error('Error fetching gameweek fixture details:', error)
    return []
  }
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

/**
 * Get all predictions for a specific fixture
 * 
 * @param fixtureId - Fixture ID
 * @returns Promise<Map<userId, PredictionEntry>>
 */
async function getPredictionsForFixture(
  fixtureId: number
): Promise<Map<string, PredictionEntry>> {
  try {
    const entriesRef = collection(db, 'predictions', String(fixtureId), 'entries')
    const entriesSnapshot = await withTimeout(
      getDocs(entriesRef),
      10000,
      'Failed to load prediction entries - request timed out'
    )

    const predictions = new Map<string, PredictionEntry>()

    entriesSnapshot.forEach((doc) => {
      const data = doc.data()
      const userId = doc.id

      // Only process entries with valid predictions
      if (!data.pick || (data.pick !== 'H' && data.pick !== 'D' && data.pick !== 'A')) {
        return // Skip entries without valid predictions
      }

      // Transform to PredictionEntry format
      const entry: PredictionEntry = {
        uid: userId,
        fixtureId,
        pick: data.pick as 'H' | 'D' | 'A',
        createdAt: data.createdAt || data.ts || Timestamp.now(),
        awarded: data.awarded || false,
        points: data.points || 0,
        correct: data.correct ?? null,
        homeTeam: data.homeTeam || { id: 0, name: '', logo: '' },
        awayTeam: data.awayTeam || { id: 0, name: '', logo: '' },
        league: data.league || { id: 0, name: '', country: '', logo: '' },
        fixtureDate: data.fixtureDate || Timestamp.now(),
        status: data.status || 'NS',
        result: data.result || null,
      }

      predictions.set(userId, entry)
    })

    return predictions
  } catch (error) {
    console.error(`Error fetching predictions for fixture ${fixtureId}:`, error)
    return new Map()
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
async function batchFetchUsers(userIds: string[]): Promise<Map<string, BatchUserData>> {
  const userDataMap = new Map<string, BatchUserData>()

  if (userIds.length === 0) {
    return userDataMap
  }

  try {
    const docPromises = userIds.map(async (userId) => {
      try {
        const userRef = doc(db, 'users', userId)
        const userDoc = await withTimeout(
          getDoc(userRef),
          10000,
          'Failed to load user data - request timed out'
        )

        if (userDoc.exists()) {
          const data = userDoc.data()
          const photoURL = data.favoritePlayer?.photo || data.photoURL || null
          return {
            userId,
            displayName: data.displayName || 'Player',
            points: data.points || 0,
            photoURL: photoURL || null,
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
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error)
        return {
          userId,
          displayName: 'Player',
          points: 0,
          photoURL: null,
          lastWeekPlace: null,
          lastCompletedGameweekId: null,
        }
      }
    })

    const results = await Promise.all(docPromises)

    results.forEach(({ userId, displayName, points, photoURL, lastWeekPlace, lastCompletedGameweekId }) => {
      userDataMap.set(userId, {
        displayName,
        points,
        photoURL: photoURL ?? null,
        lastWeekPlace: lastWeekPlace ?? null,
        lastCompletedGameweekId: lastCompletedGameweekId ?? null,
      })
    })

    return userDataMap
  } catch (error) {
    console.error('Error batch fetching users:', error)
    return userDataMap
  }
}

/**
 * Get weekly rankings for a gameweek
 * 
 * @param gameweekId - Gameweek ID
 * @param currentUserId - Optional current user ID to mark in results
 * @returns Promise<RankingEntry[]>
 */
export async function getWeeklyRankings(
  gameweekId: string,
  currentUserId?: string | null
): Promise<RankingEntry[]> {
  try {
    // Get gameweek data
    const gameweek = await getGameweekById(gameweekId)
    if (!gameweek) {
      console.error('Gameweek not found:', gameweekId)
      return []
    }

    // Get fixture IDs
    const fixtureIds = gameweek.fixtureIds || []
    if (fixtureIds.length === 0) {
      return []
    }

    // Fetch all predictions for all fixtures in parallel
    const predictionPromises = fixtureIds.map((fixtureId) =>
      getPredictionsForFixture(fixtureId)
    )
    const predictionResults = await Promise.all(predictionPromises)

    // Build a map of userId -> { fixtureId -> prediction }
    const userPredictionsMap = new Map<
      string,
      Map<number, PredictionEntry>
    >()

    // Process each fixture's predictions
    predictionResults.forEach((predictions, index) => {
      const fixtureId = fixtureIds[index]
      predictions.forEach((entry, userId) => {
        if (!userPredictionsMap.has(userId)) {
          userPredictionsMap.set(userId, new Map())
        }
        userPredictionsMap.get(userId)!.set(fixtureId, entry)
      })
    })

    // Get fixture details for building match predictions
    const fixtureDetails = await getGameweekFixtureDetails(gameweekId)

    // Build fixture details map for quick lookup
    const fixtureDetailsMap = new Map<
      number,
      { homeTeam: TeamInfo; awayTeam: TeamInfo }
    >()
    fixtureDetails.forEach((fixture) => {
      fixtureDetailsMap.set(fixture.fixtureId, {
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
      })
    })

    // Collect all unique user IDs who made predictions
    const userIds = Array.from(userPredictionsMap.keys())
    
    // Batch fetch all user documents at once (optimized: reduces N+1 queries)
    const userDataMap = await batchFetchUsers(userIds)

    // Build ranking entries
    const rankingEntries: RankingEntry[] = []

    // Process each user's predictions
    for (const [userId, predictions] of userPredictionsMap.entries()) {
      // Calculate weekly points (sum of points from all predictions)
      let weeklyPoints = 0
      const matchPredictions: MatchPrediction[] = []

      // Process each fixture
      fixtureIds.forEach((fixtureId) => {
        const prediction = predictions.get(fixtureId)
        const fixtureDetail = fixtureDetailsMap.get(fixtureId)

        if (prediction) {
          // Add points if awarded
          if (prediction.awarded && prediction.points) {
            weeklyPoints += prediction.points
          }

          // Build match prediction with correctness info
          if (fixtureDetail) {
            matchPredictions.push({
              fixtureId,
              prediction: prediction.pick,
              homeTeam: fixtureDetail.homeTeam,
              awayTeam: fixtureDetail.awayTeam,
              correct: prediction.correct ?? null,
            })
          } else {
            // Fallback: use data from prediction entry
            matchPredictions.push({
              fixtureId,
              prediction: prediction.pick,
              homeTeam: prediction.homeTeam as TeamInfo,
              awayTeam: prediction.awayTeam as TeamInfo,
              correct: prediction.correct ?? null,
            })
          }
        } else if (fixtureDetail) {
          // User didn't make a prediction for this fixture
          matchPredictions.push({
            fixtureId,
            prediction: null,
            homeTeam: fixtureDetail.homeTeam,
            awayTeam: fixtureDetail.awayTeam,
            correct: null,
          })
        }
      })

      // Only include users who made at least one prediction
      if (matchPredictions.some((mp) => mp.prediction !== null)) {
        const userData = userDataMap.get(userId) || {
          displayName: 'Player',
          points: 0,
          photoURL: null,
          lastWeekPlace: null,
          lastCompletedGameweekId: null,
        }

        rankingEntries.push({
          userId,
          displayName: userData.displayName,
          points: userData.points,
          rank: 0,
          weeklyPoints,
          matchPredictions,
          photoURL: userData.photoURL ?? null,
          isCurrentUser: currentUserId ? userId === currentUserId : false,
          lastWeekPlace: userData.lastWeekPlace ?? null,
          lastCompletedGameweekId: userData.lastCompletedGameweekId ?? null,
        })
      }
    }

    // Sort by weekly points descending, then by number of predictions
    rankingEntries.sort((a, b) => {
      const pointsDiff = (b.weeklyPoints || 0) - (a.weeklyPoints || 0)
      if (pointsDiff !== 0) {
        return pointsDiff
      }
      // If points are equal, sort by number of predictions (more predictions first)
      const aPredictions = a.matchPredictions?.filter(
        (mp) => mp.prediction !== null
      ).length || 0
      const bPredictions = b.matchPredictions?.filter(
        (mp) => mp.prediction !== null
      ).length || 0
      return bPredictions - aPredictions
    })

    // Calculate ranks with tie handling
    let currentRank = 1
    let previousPoints: number | null = null
    let usersAtCurrentRank = 0

    rankingEntries.forEach((entry) => {
      const points = entry.weeklyPoints || 0

      if (previousPoints === null) {
        // First entry
        currentRank = 1
        usersAtCurrentRank = 1
      } else if (points < previousPoints) {
        // Points decreased, move to new rank tier
        currentRank += usersAtCurrentRank
        usersAtCurrentRank = 1
      } else if (points === previousPoints) {
        // Same points, same rank
        usersAtCurrentRank++
      }

      entry.rank = currentRank
      previousPoints = points
    })

    return rankingEntries
  } catch (error) {
    console.error('Error getting weekly rankings:', error)
    return []
  }
}
