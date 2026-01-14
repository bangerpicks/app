/**
 * User utility functions for Firestore operations
 */

import { doc, getDoc, setDoc, serverTimestamp, Timestamp, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { User } from 'firebase/auth'
import { db } from './firebase'
import { RankingEntry } from '@/types/dashboard'

/**
 * User document structure in Firestore
 */
export interface UserDocument {
  uid: string
  displayName: string
  photoURL: string | null
  points: number
  totalPredictions?: number
  correctPredictions?: number
  accuracy?: number
  favoriteTeam?: {
    id: number
    name: string
    logo: string
  } | null
  favoritePlayer?: {
    id: number
    name: string
    photo: string
  } | null
  language?: 'en' | 'es-MX'
  createdAt: Timestamp
  lastUpdated: Timestamp
}

/**
 * Gets the user's display name from Firestore, falling back to Auth displayName or 'Player'
 * 
 * @param user - The Firebase Auth user object
 * @returns Promise<string> - The user's display name
 */
export async function getUserDisplayName(user: User): Promise<string> {
  try {
    if (!user || !user.uid) {
      return user?.displayName || 'Player'
    }

    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const data = userDoc.data() as UserDocument
      return data.displayName || user.displayName || 'Player'
    }

    // Fallback to Auth displayName or 'Player'
    return user.displayName || 'Player'
  } catch (error) {
    console.error('Error fetching user display name:', error)
    // Fallback to Auth displayName or 'Player'
    return user.displayName || 'Player'
  }
}

/**
 * Gets the user's points from Firestore, defaulting to 0 if not found
 * 
 * @param user - The Firebase Auth user object
 * @returns Promise<number> - The user's points
 */
export async function getUserPoints(user: User): Promise<number> {
  try {
    if (!user || !user.uid) {
      return 0
    }

    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const data = userDoc.data() as UserDocument
      return data.points || 0
    }

    // Return 0 if document doesn't exist
    return 0
  } catch (error) {
    console.error('Error fetching user points:', error)
    // Return 0 on error
    return 0
  }
}

/**
 * Gets the user's language preference from Firestore, defaulting to 'en' if not found
 * 
 * @param user - The Firebase Auth user object
 * @returns Promise<'en' | 'es-MX'> - The user's language preference
 */
export async function getUserLanguage(user: User): Promise<'en' | 'es-MX'> {
  try {
    if (!user || !user.uid) {
      return 'en'
    }

    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      const data = userDoc.data() as UserDocument
      return data.language || 'en'
    }

    // Return default 'en' if document doesn't exist
    return 'en'
  } catch (error) {
    console.error('Error fetching user language:', error)
    // Return default 'en' on error
    return 'en'
  }
}

/**
 * Updates the user's language preference in Firestore
 * 
 * @param user - The Firebase Auth user object
 * @param language - The language preference ('en' | 'es-MX')
 * @returns Promise<void>
 */
export async function updateUserLanguage(user: User, language: 'en' | 'es-MX'): Promise<void> {
  try {
    if (!user || !user.uid) {
      throw new Error('Invalid user object')
    }

    const userRef = doc(db, 'users', user.uid)
    const updates: Partial<UserDocument> = {
      language,
      lastUpdated: serverTimestamp() as any,
    }

    await setDoc(userRef, updates, { merge: true })
    console.log(`Updated user language for ${user.uid} to ${language}`)
  } catch (error: any) {
    console.error(`Error updating user language for ${user.uid}:`, error)
    
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
 * Ensures a user document exists in Firestore with the given displayName.
 * Creates a new document if it doesn't exist, or updates the displayName if it does.
 * 
 * @param user - The Firebase Auth user object
 * @param displayName - The user's display name
 * @returns Promise<void>
 */
export async function ensureUserDocument(user: User, displayName: string): Promise<void> {
  try {
    if (!user || !user.uid) {
      throw new Error('Invalid user object')
    }

    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      // Creating new user document
      const userData: Partial<UserDocument> = {
        uid: user.uid,
        displayName: displayName || 'Player',
        photoURL: user.photoURL || null,
        points: 0,
        createdAt: serverTimestamp() as any,
        lastUpdated: serverTimestamp() as any,
      }

      await setDoc(userRef, userData)
      console.log(`Created new user document for ${user.uid}`)
    } else {
      // User document exists - update displayName
      const currentData = userDoc.data()
      const updates: Partial<UserDocument> = {
        displayName: displayName || currentData.displayName || 'Player',
        lastUpdated: serverTimestamp() as any,
      }

      // Also update photoURL if it changed
      if (user.photoURL !== currentData.photoURL) {
        updates.photoURL = user.photoURL || null
      }

      await setDoc(userRef, updates, { merge: true })
      console.log(`Updated user document for ${user.uid}`)
    }
  } catch (error: any) {
    console.error(`Error ensuring user document for ${user.uid}:`, error)
    
    // Provide more specific error information
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check your authentication status.')
    } else if (error.code === 'unauthenticated') {
      throw new Error('User not authenticated. Please log in again.')
    } else if (error.code === 'not-found') {
      throw new Error('Database not found. Please check your configuration.')
    }
    
    throw error
  }
}

/**
 * Gets all-time rankings from Firestore, ordered by points descending.
 * Calculates ranks with proper tie handling (users with same points get same rank).
 * 
 * @param currentUser - Optional Firebase Auth user object to mark current user in results
 * @param limitCount - Maximum number of users to return (default: 100)
 * @returns Promise<RankingEntry[]> - Array of ranking entries sorted by points
 */
export async function getAllTimeRankings(
  currentUser: User | null = null,
  limitCount: number = 100
): Promise<RankingEntry[]> {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, orderBy('points', 'desc'), limit(limitCount))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return []
    }

    const rankings: RankingEntry[] = []
    let currentRank = 1
    let previousPoints: number | null = null
    let usersAtCurrentRank = 0

    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserDocument
      const userId = doc.id
      const points = data.points || 0

      // Calculate rank with tie handling
      if (previousPoints === null) {
        // First user - always rank 1
        currentRank = 1
        usersAtCurrentRank = 1
      } else if (points < previousPoints) {
        // Points decreased, so we've moved to a new rank tier
        // New rank = previous rank + number of users at that rank
        currentRank += usersAtCurrentRank
        usersAtCurrentRank = 1
      } else if (points === previousPoints) {
        // Same points as previous user, same rank
        usersAtCurrentRank++
      }
      // Note: points > previousPoints shouldn't happen with desc order, but if it does, treat as new rank

      // Calculate accuracy if we have the data
      let accuracy = data.accuracy || 0
      if (!accuracy && data.totalPredictions && data.totalPredictions > 0 && data.correctPredictions !== undefined) {
        accuracy = (data.correctPredictions / data.totalPredictions) * 100
      }

      const entry: RankingEntry = {
        userId,
        displayName: data.displayName || 'Player',
        points,
        rank: currentRank,
        totalPredictions: data.totalPredictions || 0,
        correctPredictions: data.correctPredictions || 0,
        accuracy: Math.round(accuracy * 10) / 10, // Round to 1 decimal place
        isCurrentUser: currentUser ? userId === currentUser.uid : false,
      }

      rankings.push(entry)
      previousPoints = points
    })

    return rankings
  } catch (error) {
    console.error('Error fetching all-time rankings:', error)
    // Return empty array on error
    return []
  }
}
