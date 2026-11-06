/**
 * Prediction utility functions for Firestore operations
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  writeBatch,
  Timestamp,
  increment,
} from 'firebase/firestore'
import { db } from './firebase'
import { Prediction, MatchCardData } from '@/types/dashboard'
import { withTimeout } from './firestore-utils'

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
  updatedAt: ReturnType<typeof serverTimestamp>
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
export async function savePredictions(
  uid: string,
  predictions: Map<number, Prediction>,
  matchData: MatchCardData[],
  gameweekId?: string | null
): Promise<void> {
  try {
    if (!uid) {
      throw new Error('User ID is required')
    }

    if (predictions.size === 0) {
      return
    }

    if (!gameweekId) {
      throw new Error('gameweekId is required')
    }

    // Create a map of fixtureId -> matchData for quick lookup
    const matchDataMap = new Map<number, MatchCardData>()
    matchData.forEach((match) => {
      matchDataMap.set(match.fixtureId, match)
    })

    const batch = writeBatch(db)
    const cacheRef = doc(db, 'users', uid, 'gameweek_predictions', gameweekId)
    const cacheSnap = await getDoc(cacheRef)
    const existingPredictions: Record<string, Prediction> = cacheSnap.exists()
      ? (cacheSnap.data() as GameweekPredictionsCache).predictions || {}
      : {}
    const mergedPredictions: Record<string, Prediction> = { ...existingPredictions }
    let wrote = 0

    // Process each prediction
    for (const [fixtureId, pick] of predictions.entries()) {
      const match = matchDataMap.get(fixtureId)
      if (!match) {
        continue
      }

      const parentRef = doc(db, 'predictions', String(fixtureId))
      const entryRef = doc(db, 'predictions', String(fixtureId), 'entries', uid)
      const entrySnap = await getDoc(entryRef)
      // Public per-fixture count. Only a brand-new entry may add 1.
      if (entrySnap.exists()) {
        batch.set(parentRef, { exists: true }, { merge: true })
      } else {
        batch.set(parentRef, { exists: true, playerCount: increment(1) }, { merge: true })
      }

      // Build entry data
      const entryData: Partial<PredictionEntry> = {
        uid,
        fixtureId,
        gameweekId,
        pick,
        createdAt: serverTimestamp() as any,
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
          country: '', // MatchCardData doesn't have country, use empty string
          logo: match.league.logo || '',
        },
        fixtureDate: Timestamp.fromDate(match.date),
        status: match.matchStatus || 'NS',
        result: match.score
          ? {
              homeGoals: match.score.home,
              awayGoals: match.score.away,
            }
          : null,
      }

      batch.set(entryRef, entryData, { merge: true })
      mergedPredictions[String(fixtureId)] = pick
      wrote += 1
    }

    if (wrote === 0) {
      return
    }

    batch.set(cacheRef, {
      predictions: mergedPredictions,
      updatedAt: serverTimestamp(),
    })
    // Unique gameweek total. +1 only the first time this user saves in the week.
    if (!cacheSnap.exists()) {
      batch.update(doc(db, 'gameweeks', gameweekId), { playerCount: increment(1) })
    }

    await batch.commit()
  } catch (error: any) {
    console.error('Error saving predictions:', error)
    
    // Provide more specific error information
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check your authentication status.')
    } else if (error.code === 'unauthenticated') {
      throw new Error('User not authenticated. Please log in again.')
    }
    
    throw error
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
export async function getUserPredictionsForGameweek(
  uid: string,
  gameweekId: string,
  fixtureIds: number[]
): Promise<Map<number, Prediction>> {
  try {
    if (!uid || !gameweekId || fixtureIds.length === 0) {
      return new Map()
    }

    const cacheRef = doc(db, 'users', uid, 'gameweek_predictions', gameweekId)
    const cacheDoc = await withTimeout(
      getDoc(cacheRef),
      5000,
      'Failed to load predictions - request timed out'
    )

    if (cacheDoc.exists()) {
      const data = cacheDoc.data() as GameweekPredictionsCache
      const predictions = data.predictions || {}
      const result = new Map<number, Prediction>()
      fixtureIds.forEach((fixtureId) => {
        const pick = predictions[String(fixtureId)]
        if (pick) result.set(fixtureId, pick)
      })
      return result
    }
  } catch (error) {
    console.warn('Gameweek predictions cache miss, falling back to per-fixture reads:', error)
  }

  return getUserPredictions(uid, fixtureIds)
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
export async function getGameweekPlayerCount(
  fixtureIds: number[],
  gameweekId?: string | null
): Promise<number> {
  try {
    if (gameweekId) {
      try {
        const gameweekSnap = await withTimeout(
          getDoc(doc(db, 'gameweeks', gameweekId)),
          10000,
          'Failed to load player count - request timed out'
        )
        const count = gameweekSnap.exists() ? gameweekSnap.data().playerCount : undefined
        if (typeof count === 'number') {
          return count
        }
      } catch (error) {
        console.warn('Public player count unavailable, falling back to entry reads:', error)
      }
    }

    if (!fixtureIds || fixtureIds.length === 0) {
      return 0
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

    return uniquePlayerIds.size
  } catch (error) {
    console.error('Error counting players for gameweek:', error)
    return 0
  }
}