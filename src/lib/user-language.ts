import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from './firebase'

/**
 * Saved language on the user doc, or null when unset (no preference yet).
 */
export async function getUserLanguage(user: User): Promise<'en' | 'es-MX' | null> {
  try {
    if (!user?.uid) {
      return null
    }

    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return null
    }

    const data = userDoc.data()
    if (data.language === 'en' || data.language === 'es-MX') {
      return data.language
    }

    return null
  } catch (error) {
    console.error('Error fetching user language:', error)
    return null
  }
}

export async function updateUserLanguage(user: User, language: 'en' | 'es-MX'): Promise<void> {
  try {
    if (!user?.uid) {
      throw new Error('Invalid user object')
    }

    const userRef = doc(db, 'users', user.uid)
    await setDoc(
      userRef,
      {
        language,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    )
  } catch (error: unknown) {
    console.error(`Error updating user language for ${user.uid}:`, error)

    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : ''
    if (code === 'permission-denied') {
      throw new Error('Permission denied. Please check your authentication status.')
    }
    if (code === 'unauthenticated') {
      throw new Error('User not authenticated. Please log in again.')
    }

    throw error
  }
}