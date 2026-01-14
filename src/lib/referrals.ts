/**
 * Referral tracking and management functions
 */

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, Timestamp, increment } from 'firebase/firestore'
import { db } from './firebase'

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
 * Tracks a referral signup and awards points to the referrer
 * 
 * @param newUserUid - The UID of the newly created user
 * @param referralCode - The referral code used
 * @returns Promise<void>
 */
export async function trackReferralSignup(newUserUid: string, referralCode: string): Promise<void> {
  try {
    if (!newUserUid || !referralCode) {
      throw new Error('Invalid parameters: newUserUid and referralCode are required')
    }

    const trimmedCode = referralCode.trim().toUpperCase()

    // Validate referral code and get referrer UID
    const validation = await validateReferralCode(trimmedCode)
    if (!validation.valid || !validation.referrerUid) {
      throw new Error('Invalid referral code')
    }

    const referrerUid = validation.referrerUid

    // Prevent self-referral
    if (referrerUid === newUserUid) {
      throw new Error('Self-referral is not allowed')
    }

    // Check if referral already exists
    const referralsRef = collection(db, 'referrals')
    const existingQuery = query(
      referralsRef,
      where('referrerUid', '==', referrerUid),
      where('referredUid', '==', newUserUid)
    )
    const existingSnapshot = await getDocs(existingQuery)

    if (!existingSnapshot.empty) {
      throw new Error('Referral already exists')
    }

    // Create referral document
    const referralData: ReferralDocument = {
      referrerUid,
      referredUid: newUserUid,
      referralCode: trimmedCode,
      status: 'completed',
      pointsAwarded: 5,
      createdAt: serverTimestamp() as any,
      completedAt: serverTimestamp() as any,
    }

    const referralRef = doc(referralsRef)
    await setDoc(referralRef, referralData)

    // Award referral points to referrer (using increment for atomic update)
    const referrerRef = doc(db, 'users', referrerUid)
    await updateDoc(referrerRef, {
      referralPoints: increment(5),
      lastUpdated: serverTimestamp() as any,
    })

    console.log(`Awarded 5 referral points to ${referrerUid} for referral of ${newUserUid}`)
  } catch (error: any) {
    console.error('Error tracking referral signup:', error)
    throw error
  }
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
