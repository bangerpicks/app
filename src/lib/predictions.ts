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
} from 'firebase/firestore'
import { db } from './firebase'
import { Prediction, MatchCardData } from '@/types/dashboard'

/**
 * Prediction entry structure in Firestore
 * Matches the schema defined in docs/architecture/database-schema.md
 */
export interface PredictionEntry {
  // User & Fixture Info
  uid: string
  fixtureId: number

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
 * Save multiple predictions to Firestore in a batch
 * 
 * @param uid - User ID
 * @param predictions - Map of fixtureId -> prediction ('H' | 'D' | 'A')
 * @param matchData - Array of match data to extract metadata from
 * @returns Promise<void>
 */
export async function savePredictions(
  uid: string,
  predictions: Map<number, Prediction>,
  matchData: MatchCardData[]
): Promise<void> {
  try {
    if (!uid) {
      throw new Error('User ID is required')
    }

    if (predictions.size === 0) {
      return
    }

    // Create a map of fixtureId -> matchData for quick lookup
    const matchDataMap = new Map<number, MatchCardData>()
    matchData.forEach((match) => {
      matchDataMap.set(match.fixtureId, match)
    })

    const batch = writeBatch(db)

    // Process each prediction
    for (const [fixtureId, pick] of predictions.entries()) {
      const match = matchDataMap.get(fixtureId)
      if (!match) {
        continue
      }

      // Ensure parent document exists (required for security rules)
      const parentRef = doc(db, 'predictions', String(fixtureId))
      batch.set(parentRef, { exists: true }, { merge: true })

      // Create prediction entry document reference
      const entryRef = doc(db, 'predictions', String(fixtureId), 'entries', uid)

      // Build entry data
      const entryData: Partial<PredictionEntry> = {
        uid,
        fixtureId,
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
    const entryDoc = await getDoc(entryRef)

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
 * Get user predictions for multiple fixtures
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
  fixtureIds: number[]
): Promise<number> {
  try {
    if (!fixtureIds || fixtureIds.length === 0) {
      return 0
    }

    // Use a Set to track unique user IDs
    const uniquePlayerIds = new Set<string>()

    // Fetch all prediction entries for each fixture
    const fetchPromises = fixtureIds.map(async (fixtureId) => {
      try {
        const entriesRef = collection(db, 'predictions', String(fixtureId), 'entries')
        const entriesSnapshot = await getDocs(entriesRef)
        
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