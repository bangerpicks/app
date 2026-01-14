'use client'

import { useState } from 'react'
import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { ShopItem } from './ShopItem'
import { ReferralPopup } from './ReferralPopup'
import { ShopClientProps } from '@/types/shop'
import { ShoppingBag, Coins } from 'lucide-react'

export function ShopClient({ items, userPoints, username }: ShopClientProps) {
  const [redeemedItems, setRedeemedItems] = useState<Set<string>>(new Set())
  const [showConfirmation, setShowConfirmation] = useState<{
    itemId: string
    itemName: string
    pointsCost: number
  } | null>(null)

  // Calculate available points (subtract redeemed items)
  const getAvailablePoints = () => {
    let totalRedeemed = 0
    redeemedItems.forEach((itemId) => {
      const item = items.find((i) => i.itemId === itemId)
      if (item) {
        totalRedeemed += item.pointsCost
      }
    })
    return userPoints - totalRedeemed
  }

  const handleRedeem = (itemId: string) => {
    const item = items.find((i) => i.itemId === itemId)
    if (!item) return

    // Check if already redeemed
    if (redeemedItems.has(itemId)) {
      return
    }

    // Check if user can afford
    const availablePoints = getAvailablePoints()
    if (availablePoints < item.pointsCost) {
      return
    }

    // Show confirmation dialog
    setShowConfirmation({
      itemId: item.itemId,
      itemName: item.name,
      pointsCost: item.pointsCost,
    })
  }

  const confirmRedeem = () => {
    if (!showConfirmation) return

    // Add to redeemed items (mock redemption)
    setRedeemedItems((prev) => new Set(prev).add(showConfirmation.itemId))

    // TODO: In production, call API to redeem item and update user points
    // await redeemShopItem(showConfirmation.itemId)
    // const updatedUser = await getUserPoints()
    // setUserPoints(updatedUser.points)

    // Close confirmation
    setShowConfirmation(null)
  }

  const cancelRedeem = () => {
    setShowConfirmation(null)
  }

  // Filter to only show active items
  const activeItems = items.filter((item) => item.status === 'active')

  return (
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex flex-col">
      {/* Header */}
      <Header username={username} />

      {/* Referral Popup */}
      <ReferralPopup />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-5 pb-20 sm:pb-24 py-4 sm:py-5 overflow-x-hidden">
        {/* Title Section */}
        <div className="w-full flex flex-col items-center gap-2 mb-6">
          <ShoppingBag className="w-12 h-12 text-lime-yellow mb-2" />
          <h1 className="text-3xl sm:text-4xl font-bold text-ivory">Shop</h1>
          <p className="text-ivory/70 text-sm sm:text-base text-center">
            Redeem your points for awesome rewards
          </p>
        </div>

        {/* Points Balance Card */}
        <div className="w-full max-w-2xl mx-auto mb-6 bg-lime-yellow rounded-lg px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <Coins className="w-5 h-5 text-midnight-violet" />
            <span className="text-midnight-violet font-semibold text-sm">
              Shop Points:
            </span>
            <span className="text-midnight-violet font-bold text-xl">
              {getAvailablePoints().toLocaleString()}
            </span>
          </div>
        </div>

        {/* Items Grid */}
        {activeItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ivory/70 text-lg">No items available at the moment</p>
            <p className="text-ivory/50 text-sm mt-2">Check back soon for new items!</p>
          </div>
        ) : (
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {activeItems.map((item) => (
              <ShopItem
                key={item.itemId}
                item={item}
                userPoints={getAvailablePoints()}
                isRedeemed={redeemedItems.has(item.itemId)}
                onRedeem={handleRedeem}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-midnight-violet border-2 border-lime-yellow rounded-lg p-6 max-w-md w-full">
            <h3 className="text-ivory font-bold text-xl mb-2">Confirm Redemption</h3>
            <p className="text-ivory/70 mb-4">
              Are you sure you want to redeem <span className="font-semibold text-ivory">{showConfirmation.itemName}</span> for{' '}
              <span className="font-semibold text-lime-yellow">{showConfirmation.pointsCost} points</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelRedeem}
                className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-ivory/10 text-ivory hover:bg-ivory/15 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRedeem}
                className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
