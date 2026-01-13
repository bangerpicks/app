/**
 * User utility functions for Firestore operations
 */

import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { User } from 'firebase/auth'
import { db } from './firebase'

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
