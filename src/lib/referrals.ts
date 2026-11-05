/**
 * Referral tracking and management functions
 */

import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'

/**
 * Referral document structure in Firestore
 */
export interface ReferralDocument {
  referrerUid: string
  referredUid: string
  referralCode: string
  status: 'pending' | 'completed'
  pointsAwarded: number
  createdAt: Timestamp
  completedAt: Timestamp | null
}

/**
 * Validates a referral code and returns the referrer UID if valid
 * 
 * @param code - The referral code to validate
 * @returns Promise<{valid: boolean, referrerUid: string | null}>
 */
export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerUid: string | null }> {
  try {
    if (!code || code.trim().length === 0) {
      return { valid: false, referrerUid: null }
    }

    const trimmedCode = code.trim().toUpperCase()

    // Find user with this referral code
    const usersRef = collection(db, 'users')
    const codeQuery = query(usersRef, where('referralCode', '==', trimmedCode))
    const codeSnapshot = await getDocs(codeQuery)

    if (codeSnapshot.empty) {
      return { valid: false, referrerUid: null }
    }

    const userDoc = codeSnapshot.docs[0]
    return { valid: true, referrerUid: userDoc.id }
  } catch (error) {
    console.error('Error validating referral code:', error)
    return { valid: false, referrerUid: null }
  }
}

/**
 * Tracks a referral signup and awards points to the referrer.
 * Calls a Cloud Function (runs with admin privileges) since client cannot
 * write to referrals collection or update another user's document.
 *
 * @param _newUserUid - Unused; caller must be the new user (auth context used server-side)
 * @param referralCode - The referral code used
 * @returns Promise<void>
 */
export async function trackReferralSignup(_newUserUid: string, referralCode: string): Promise<void> {
  if (!referralCode || !referralCode.trim()) {
    throw new Error('referralCode is required')
  }

  const trackReferral = httpsCallable<{ referralCode: string }, { success: boolean }>(
    functions,
    'trackReferralSignup'
  )
  await trackReferral({ referralCode: referralCode.trim().toUpperCase() })
}

/**
 * Gets referral statistics for a user
 * 
 * @param userUid - The user's UID
 * @returns Promise<{total: number, completed: number}>
 */
export async function getReferralStats(userUid: string): Promise<{ total: number; completed: number }> {
  try {
    const referralsRef = collection(db, 'referrals')
    const referrerQuery = query(referralsRef, where('referrerUid', '==', userUid))
    const snapshot = await getDocs(referrerQuery)

    let total = 0
    let completed = 0

    snapshot.forEach((doc) => {
      const data = doc.data() as ReferralDocument
      total++
      if (data.status === 'completed') {
        completed++
      }
    })

    return { total, completed }
  } catch (error) {
    console.error('Error getting referral stats:', error)
    return { total: 0, completed: 0 }
  }
}
