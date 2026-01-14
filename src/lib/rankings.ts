/**
 * Weekly rankings utility functions
 * Handles fetching and calculating weekly rankings for gameweeks
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { getGameweekById, getAllGameweeks, AdminGameweekData, GameweekFixtureData } from './admin'
import { getGameweekPlayerCount } from './predictions'
import {
  RankingEntry,
  GameweekData,
  GameweekRankingData,
  MatchPrediction,
  TeamInfo,
  GameweekStatus as DashboardGameweekStatus,
} from '@/types/dashboard'
import { PredictionEntry } from './predictions'

/**
 * Get the current active gameweek, or latest completed gameweek if none active
 * 
 * @returns Promise<AdminGameweekData | null>
 */
export async function getCurrentGameweek(): Promise<AdminGameweekData | null> {
  try {
    // First, try to get an active gameweek
    const activeGameweeks = await getAllGameweeks({
      status: 'active',
      sortBy: 'date',
      sortOrder: 'desc',
    })

    if (activeGameweeks.length > 0) {
      return activeGameweeks[0] // Return the most recent active gameweek
    }

    // If no active gameweek, get the latest completed gameweek
    const completedGameweeks = await getAllGameweeks({
      status: 'completed',
      sortBy: 'date',
      sortOrder: 'desc',
    })

    if (completedGameweeks.length > 0) {
      return completedGameweeks[0] // Return the most recent completed gameweek
    }

    // If no completed gameweek, try to get the latest gameweek by date (any status except archived)
    const allGameweeks = await getAllGameweeks({
      sortBy: 'date',
      sortOrder: 'desc',
    })

    // Filter out archived gameweeks
    const nonArchived = allGameweeks.filter((gw) => gw.status !== 'archived')
    
    return nonArchived.length > 0 ? nonArchived[0] : null
  } catch (error) {
    console.error('Error getting current gameweek:', error)
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
    const fixturesSnapshot = await getDocs(fixturesRef)

    if (fixturesSnapshot.empty) {
      return []
    }

    const fixtures: Array<{
      fixtureId: number
      homeTeam: TeamInfo
      awayTeam: TeamInfo
    }> = []

    fixturesSnapshot.forEach((doc) => {
      const data = doc.data() as GameweekFixtureData
      const fixtureId = data.fixtureId || parseInt(doc.id, 10)

      if (data.teams && data.teams.home && data.teams.away) {
        fixtures.push({
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
        })
      }
    })

    // Sort by fixtureId to maintain order
    fixtures.sort((a, b) => a.fixtureId - b.fixtureId)

    return fixtures
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
  // Map admin status to dashboard status
  const statusMap: Record<string, DashboardGameweekStatus> = {
    draft: 'UPCOMING',
    active: 'OPEN',
    completed: 'COMPLETED',
    archived: 'COMPLETED',
  }

  const dashboardStatus = statusMap[adminGameweek.status] || 'UPCOMING'

  // Get player count
  const playerCount = await getGameweekPlayerCount(adminGameweek.fixtureIds)

  // Transform to GameweekData
  const gameweekData: GameweekData = {
    gameweekId: adminGameweek.gameweekId,
    name: adminGameweek.name,
    playerCount,
    status: dashboardStatus,
    deadline: adminGameweek.deadline?.toDate(),
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
    const entriesSnapshot = await getDocs(entriesRef)

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

/**
 * Get user display name from Firestore
 * 
 * @param userId - User ID
 * @returns Promise<string>
 */
async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const data = userDoc.data()
      return data.displayName || 'Player'
    }

    return 'Player'
  } catch (error) {
    console.error(`Error fetching display name for user ${userId}:`, error)
    return 'Player'
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
      console.warn('Gameweek has no fixtures')
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

    // Build ranking entries
    const rankingEntries: RankingEntry[] = []

    // Fetch user data and build entries
    const userPromises = Array.from(userPredictionsMap.entries()).map(
      async ([userId, predictions]) => {
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
          // Get user display name
          const displayName = await getUserDisplayName(userId)

          // Get user's total points (for all-time ranking context)
          const userRef = doc(db, 'users', userId)
          const userDoc = await getDoc(userRef)
          const userData = userDoc.exists() ? userDoc.data() : {}
          const totalPoints = userData.points || 0

          rankingEntries.push({
            userId,
            displayName,
            points: totalPoints, // All-time points
            rank: 0, // Will be calculated after sorting
            weeklyPoints,
            matchPredictions,
            isCurrentUser: currentUserId ? userId === currentUserId : false,
          })
        }
      }
    )

    await Promise.all(userPromises)

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
