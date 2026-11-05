/**
 * Shop redemption operations
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  updateDoc,
  increment,
} from 'firebase/firestore'
import { User } from 'firebase/auth'
import { db } from './firebase'
import { ShopItem, FavoritePlayerOption, isFavoritePlayerCustomization } from '@/types/shop'
import { withTimeout } from './firestore-utils'

/**
 * Redemption data for favorite-player items (chosen player at redemption time)
 */
export interface FavoritePlayerRedemptionData {
  playerId: number
  playerName: string
  playerPhoto: string
  pointsCost: number
}

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
  /** For favorite-player items: the selected player and actual cost */
  redemptionData?: FavoritePlayerRedemptionData
}

/**
 * Shop points = correct predictions + referral points (no multiplier/accuracy).
 * Balance = shop points earned minus total already redeemed.
 */
export function computeShopPointsBalance(
  correctPredictions: number,
  referralPoints: number,
  totalRedeemed: number
): number {
  return Math.max(0, (correctPredictions || 0) + (referralPoints || 0) - totalRedeemed)
}

/**
 * Sum of pointsCost for all redemptions by a user (used to compute spendable shop balance).
 */
export async function getTotalRedeemedForUser(userId: string): Promise<number> {
  try {
    const redemptionsRef = collection(db, 'redemptions')
    const q = query(redemptionsRef, where('userId', '==', userId))
    const snapshot = await getDocs(q)
    let total = 0
    snapshot.docs.forEach((d) => {
      const data = d.data()
      total += data.pointsCost ?? 0
    })
    return total
  } catch (error) {
    console.error('Error fetching total redeemed for user:', error)
    return 0
  }
}

/**
 * Redeem a shop item
 * 
 * @param user - The authenticated user
 * @param item - The shop item to redeem
 * @param selectedPlayer - For favorite-player items: the chosen player (required)
 * @returns Promise<{ redemptionId: string; pointsRemaining: number }>
 */
export async function redeemShopItem(
  user: User,
  item: ShopItem,
  selectedPlayer?: FavoritePlayerOption
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
    if (item.category === 'physical' && item.stock != null && item.stock <= 0) {
      throw new Error('Item is out of stock')
    }

    const isFavoritePlayer = isFavoritePlayerCustomization(item.customization)
    if (isFavoritePlayer && !selectedPlayer) {
      throw new Error('Please select a player to redeem')
    }
    if (isFavoritePlayer && selectedPlayer) {
      const cust = item.customization as { playerOptions: Array<{ playerId: number }> }
      const valid = cust?.playerOptions?.some((p) => p.playerId === selectedPlayer.playerId) ?? false
      if (!valid) {
        throw new Error('Invalid player selection')
      }
    }

    const actualPointsCost = isFavoritePlayer && selectedPlayer
      ? selectedPlayer.pointsCost
      : item.pointsCost

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
    const correctPredictions = userData.correctPredictions ?? 0
    const referralPoints = userData.referralPoints ?? 0
    const totalRedeemed = await getTotalRedeemedForUser(user.uid)
    const currentBalance = computeShopPointsBalance(correctPredictions, referralPoints, totalRedeemed)

    // Check if user has enough shop points (correct predictions + referrals, minus already redeemed)
    if (currentBalance < actualPointsCost) {
      throw new Error('Insufficient points')
    }

    // Create redemption record (we do not deduct from user doc; balance = earned - redeemed)
    const redemptionId = `redemption-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const now = Timestamp.now()

    const redemptionDoc: RedemptionDocument = {
      redemptionId,
      userId: user.uid,
      itemId: item.itemId,
      itemName: item.name,
      pointsCost: actualPointsCost,
      redeemedAt: now,
      status: 'pending',
      updatedAt: now,
      ...(isFavoritePlayer && selectedPlayer && {
        redemptionData: {
          playerId: selectedPlayer.playerId,
          playerName: selectedPlayer.name,
          playerPhoto: selectedPlayer.photo,
          pointsCost: selectedPlayer.pointsCost,
        },
      }),
    }

    const redemptionRef = doc(db, 'redemptions', redemptionId)
    await setDoc(redemptionRef, redemptionDoc)

    // Update stock if physical item
    if (item.category === 'physical' && item.stock !== null) {
      const itemRef = doc(db, 'shopItems', item.itemId)
      await updateDoc(itemRef, {
        stock: increment(-1),
        updatedAt: Timestamp.now(),
      })
    }

    const pointsRemaining = currentBalance - actualPointsCost

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
