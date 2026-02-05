/**
 * Shop redemption operations
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  Timestamp,
  updateDoc,
  increment,
} from 'firebase/firestore'
import { User } from 'firebase/auth'
import { db } from './firebase'
import { ShopItem } from '@/types/shop'
import { withTimeout } from './firestore-utils'

/**
 * Redemption document structure
 */
export interface RedemptionDocument {
  redemptionId: string
  userId: string
  itemId: string
  itemName: string
  pointsCost: number
  redeemedAt: Timestamp
  status: 'pending' | 'processing' | 'fulfilled' | 'cancelled'
  fulfilledAt?: Timestamp
  updatedAt: Timestamp
}

/**
 * Redeem a shop item
 * 
 * @param user - The authenticated user
 * @param item - The shop item to redeem
 * @returns Promise<{ redemptionId: string; pointsRemaining: number }>
 */
export async function redeemShopItem(
  user: User,
  item: ShopItem
): Promise<{ redemptionId: string; pointsRemaining: number }> {
  try {
    if (!user || !user.uid) {
      throw new Error('User must be authenticated')
    }

    // Check if item is available
    if (item.status !== 'active') {
      throw new Error('Item is not available for redemption')
    }

    // Check stock for physical items
    if (item.category === 'physical' && item.stock !== null && item.stock <= 0) {
      throw new Error('Item is out of stock')
    }

    // Get user document to check points
    const userRef = doc(db, 'users', user.uid)
    const userDoc = await withTimeout(
      getDoc(userRef),
      10000,
      'Failed to load user data - request timed out'
    )

    if (!userDoc.exists()) {
      throw new Error('User document not found')
    }

    const userData = userDoc.data()
    const currentPoints = userData.referralPoints || 0

    // Check if user has enough points
    if (currentPoints < item.pointsCost) {
      throw new Error('Insufficient points')
    }

    // Create redemption record
    const redemptionId = `redemption-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = Timestamp.now()

    const redemptionData: RedemptionDocument = {
      redemptionId,
      userId: user.uid,
      itemId: item.itemId,
      itemName: item.name,
      pointsCost: item.pointsCost,
      redeemedAt: now,
      status: 'pending',
      updatedAt: now,
    }

    // Deduct points from user (atomic operation)
    await updateDoc(userRef, {
      referralPoints: increment(-item.pointsCost),
    })

    // Create redemption document
    const redemptionRef = doc(db, 'redemptions', redemptionId)
    await setDoc(redemptionRef, redemptionData)

    // Update stock if physical item
    if (item.category === 'physical' && item.stock !== null) {
      const itemRef = doc(db, 'shopItems', item.itemId)
      await updateDoc(itemRef, {
        stock: increment(-1),
        updatedAt: Timestamp.now(),
      })
    }

    const pointsRemaining = currentPoints - item.pointsCost

    return {
      redemptionId,
      pointsRemaining: Math.max(0, pointsRemaining),
    }
  } catch (error) {
    console.error('Error redeeming shop item:', error)
    throw error
  }
}

/**
 * Update redemption status
 * 
 * @param redemptionId - Redemption ID
 * @param status - New status
 */
export async function updateRedemptionStatus(
  redemptionId: string,
  status: RedemptionDocument['status']
): Promise<void> {
  try {
    const redemptionRef = doc(db, 'redemptions', redemptionId)
    await updateDoc(redemptionRef, {
      status,
      updatedAt: Timestamp.now(),
      ...(status === 'fulfilled' && { fulfilledAt: Timestamp.now() }),
    })
  } catch (error) {
    console.error('Error updating redemption status:', error)
    throw error
  }
}
