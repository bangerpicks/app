/**
 * Prediction utility functions for Firestore operations
 */

import { doc, getDoc, getDocs, collection, Timestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'
import { Prediction, MatchCardData } from '@/types/dashboard'
import { withTimeout } from './firestore-utils'
import { getDocServerPreferring } from './firestore-server-read'

/** Stable sentinel; translate in dashboard UI via dashboard.partialPredictionsSave. */
export const PARTIAL_PREDICTIONS_SAVE_ERROR = 'partial-predictions-save'

/**
 * Prediction entry structure in Firestore
 * Matches the schema defined in docs/architecture/database-schema.md
 */
export interface PredictionEntry {
  // User & Fixture Info
  uid: string
  fixtureId: number
  gameweekId?: string

  // Prediction
  pick: 'H' | 'D' | 'A'
  createdAt: Timestamp

  // Scoring
  awarded: boolean
  points: number
  correct: boolean | null

  // Match Information (cached)
  homeTeam: {
    id: number
    name: string
    logo: string
  }
  awayTeam: {
    id: number
    name: string
    logo: string
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
  }

  // Fixture Details
  fixtureDate: Timestamp
  status: string // Match status (NS, 1H, HT, 2H, ET, FT, etc.)

  // Result (when available)
  result: {
    homeGoals: number
    awayGoals: number
  } | null
}

/**
 * Gameweek predictions cache document structure
 * Stored at users/{uid}/gameweek_predictions/{gameweekId} for fast single-read loading
 */
interface GameweekPredictionsCache {
  predictions: Record<string, Prediction> // fixtureId (string) -> pick
  updatedAt?: unknown
}

/**
 * Save multiple predictions to Firestore in a batch
 * Also updates the user's gameweek cache when gameweekId is provided (fast load path)
 * 
 * @param uid - User ID
 * @param predictions - Map of fixtureId -> prediction ('H' | 'D' | 'A')
 * @param matchData - Array of match data to extract metadata from
 * @param gameweekId - Optional gameweek ID; when provided, updates cache for fast loading
 * @returns Promise<void>
 */
export type SavePredictionsResult = {
  joinedGameweek: boolean
}

export async function savePredictions(
  uid: string,
  predictions: Map<number, Prediction>,
  matchData: MatchCardData[],
  gameweekId?: string | null
): Promise<SavePredictionsResult> {
  try {
    if (!uid) {
      throw new Error('User ID is required')
    }

    if (predictions.size === 0) {
      return { joinedGameweek: false }
    }

    if (!gameweekId) {
      throw new Error('gameweekId is required')
    }

    if (matchData.length > 0) {
      const missing = matchData.filter((match) => !predictions.has(match.fixtureId))
      if (missing.length > 0) {
        throw new Error(
          `All ${matchData.length} matches must have a pick before saving (${missing.length} missing).`
        )
      }
    }

    const picks = [...predictions.entries()].map(([fixtureId, pick]) => ({ fixtureId, pick }))
    const matches = matchData.map((match) => ({
      fixtureId: match.fixtureId,
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
        logo: match.league.logo,
      },
      fixtureDateMs: match.date.getTime(),
      matchStatus: match.matchStatus,
      score: match.score ?? null,
    }))

    const saveFn = httpsCallable<
      {
        gameweekId: string
        picks: Array<{ fixtureId: number; pick: Prediction }>
        matches: typeof matches
      },
      { joinedGameweek: boolean }
    >(functions, 'saveGameweekPicks')

    const { data } = await saveFn({ gameweekId, picks, matches })
    return { joinedGameweek: Boolean(data?.joinedGameweek) }
  } catch (error: unknown) {
    console.error('Error saving predictions:', error)

    const code = (error as { code?: string })?.code
    const message = error instanceof Error ? error.message : String(error)

    if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
      throw new Error('User not authenticated. Please log in again.')
    }
    if (code === 'functions/permission-denied' || code === 'permission-denied') {
      throw new Error('Permission denied. Please check your authentication status.')
    }
    if (code === 'functions/failed-precondition' && /closed|maintenance/i.test(message)) {
      throw new Error(message)
    }

    throw error instanceof Error ? error : new Error(message || 'Failed to save predictions')
  }
}

/**
 * Get user prediction for a specific fixture
 * 
 * @param uid - User ID
 * @param fixtureId - Fixture ID
 * @returns Promise<Prediction | null>
 */
export async function getUserPrediction(
  uid: string,
  fixtureId: number
): Promise<Prediction | null> {
  try {
    if (!uid) {
      return null
    }

    const entryRef = doc(db, 'predictions', String(fixtureId), 'entries', uid)
    const entryDoc = await withTimeout(
      getDoc(entryRef),
      10000,
      'Failed to load user prediction - request timed out'
    )

    if (entryDoc.exists()) {
      const data = entryDoc.data() as PredictionEntry
      return data.pick || null
    }

    return null
  } catch (error) {
    console.error(`Error getting user prediction for fixture ${fixtureId}:`, error)
    return null
  }
}

/**
 * Get user predictions for a gameweek (fast path: 1 read instead of N)
 * Reads from users/{uid}/gameweek_predictions/{gameweekId} when available.
 * Falls back to per-fixture reads for cache miss or legacy data.
 * 
 * @param uid - User ID
 * @param gameweekId - Gameweek ID
 * @param fixtureIds - Array of fixture IDs
 * @returns Promise<Map<number, Prediction>> - Map of fixtureId -> prediction
 */
export type GameweekPredictionsReadResult = {
  predictions: Map<number, Prediction>
  servedFromCache: boolean
}

/**
 * Fast single-doc check: user has at least one saved pick for this gameweek.
 */
export async function userHasAnyPickForGameweek(
  uid: string,
  gameweekId: string
): Promise<boolean> {
  if (!uid || !gameweekId) return false

  try {
    const cacheRef = doc(db, 'users', uid, 'gameweek_predictions', gameweekId)
    const cacheRead = await getDocServerPreferring(cacheRef, {
      timeoutMs: 5000,
      timeoutMessage: 'Failed to load predictions - request timed out',
    })
    if (!cacheRead.data.exists()) return false
    const data = cacheRead.data.data() as GameweekPredictionsCache
    const predictions = data.predictions || {}
    return Object.values(predictions).some((pick) => pick === 'H' || pick === 'D' || pick === 'A')
  } catch (error) {
    console.warn('userHasAnyPickForGameweek failed:', error)
    return false
  }
}

export async function getUserPredictionsForGameweek(
  uid: string,
  gameweekId: string,
  fixtureIds: number[]
): Promise<GameweekPredictionsReadResult> {
  try {
    if (!uid || !gameweekId || fixtureIds.length === 0) {
      return { predictions: new Map(), servedFromCache: false }
    }

    const cacheRef = doc(db, 'users', uid, 'gameweek_predictions', gameweekId)
    const cacheRead = await getDocServerPreferring(cacheRef, {
      timeoutMs: 5000,
      timeoutMessage: 'Failed to load predictions - request timed out',
    })
    const cacheDoc = cacheRead.data

    if (cacheDoc.exists()) {
      const data = cacheDoc.data() as GameweekPredictionsCache
      const predictions = data.predictions || {}
      const result = new Map<number, Prediction>()
      fixtureIds.forEach((fixtureId) => {
        const pick = predictions[String(fixtureId)]
        if (pick) result.set(fixtureId, pick)
      })
      return { predictions: result, servedFromCache: cacheRead.servedFromCache }
    }
  } catch (error) {
    console.warn('Gameweek predictions cache miss, falling back to per-fixture reads:', error)
  }

  const predictions = await getUserPredictions(uid, fixtureIds)
  return { predictions, servedFromCache: false }
}

/**
 * Get user predictions for multiple fixtures (N reads - use getUserPredictionsForGameweek when gameweekId is available)
 * 
 * @param uid - User ID
 * @param fixtureIds - Array of fixture IDs
 * @returns Promise<Map<number, Prediction>> - Map of fixtureId -> prediction
 */
export async function getUserPredictions(
  uid: string,
  fixtureIds: number[]
): Promise<Map<number, Prediction>> {
  try {
    if (!uid || fixtureIds.length === 0) {
      return new Map()
    }

    const predictions = new Map<number, Prediction>()

    // Fetch predictions for each fixture
    // Note: Firestore doesn't support querying across multiple subcollections efficiently
    // So we fetch them individually (could be optimized with Promise.all)
    const fetchPromises = fixtureIds.map(async (fixtureId) => {
      try {
        const prediction = await getUserPrediction(uid, fixtureId)
        if (prediction) {
          predictions.set(fixtureId, prediction)
        }
      } catch (error) {
        // Continue with other fixtures
      }
    })

    await Promise.all(fetchPromises)

    return predictions
  } catch (error) {
    console.error('Error getting user predictions:', error)
    return new Map()
  }
}

/**
 * Count the number of unique players who have made predictions for a gameweek
 * 
 * @param fixtureIds - Array of fixture IDs for the gameweek
 * @returns Promise<number> - Number of unique players who have predicted
 */
export type GameweekPlayerCountRead = {
  count: number
  servedFromCache: boolean
}

export async function readGameweekPlayerCount(
  fixtureIds: number[],
  gameweekId?: string | null
): Promise<GameweekPlayerCountRead> {
  try {
    if (gameweekId) {
      try {
        const gameweekRef = doc(db, 'gameweeks', gameweekId)
        const gameweekRead = await getDocServerPreferring(gameweekRef, {
          timeoutMs: 10000,
          timeoutMessage: 'Failed to load player count - request timed out',
        })
        const count = gameweekRead.data.exists()
          ? gameweekRead.data.data().playerCount
          : undefined
        if (typeof count === 'number') {
          return { count, servedFromCache: gameweekRead.servedFromCache }
        }
      } catch (error) {
        console.warn('Public player count unavailable, falling back to entry reads:', error)
      }
    }

    if (!fixtureIds || fixtureIds.length === 0) {
      return { count: 0, servedFromCache: false }
    }

    // Use a Set to track unique user IDs
    const uniquePlayerIds = new Set<string>()

    // Fetch all prediction entries for each fixture
    const fetchPromises = fixtureIds.map(async (fixtureId) => {
      try {
        const entriesRef = collection(db, 'predictions', String(fixtureId), 'entries')
        const entriesSnapshot = await withTimeout(
          getDocs(entriesRef),
          10000,
          'Failed to load prediction entries - request timed out'
        )
        
        entriesSnapshot.forEach((entryDoc) => {
          // The document ID is the user's UID
          const uid = entryDoc.id
          uniquePlayerIds.add(uid)
        })
      } catch (error) {
        // If the collection doesn't exist or there's an error, skip it
      }
    })

    await Promise.all(fetchPromises)

    return { count: uniquePlayerIds.size, servedFromCache: false }
  } catch (error) {
    console.error('Error counting players for gameweek:', error)
    return { count: 0, servedFromCache: false }
  }
}

export async function getGameweekPlayerCount(
  fixtureIds: number[],
  gameweekId?: string | null
): Promise<number> {
  const result = await readGameweekPlayerCount(fixtureIds, gameweekId)
  return result.count
}