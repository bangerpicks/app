'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { ShopItem } from './ShopItem'
import { ReferralPopup } from './ReferralPopup'
import { RedemptionActionModal } from './RedemptionActionModal'
import { ShopClientProps, ShopItem as ShopItemType, FavoritePlayerOption, isFavoritePlayerCustomization } from '@/types/shop'
import { redeemShopItem } from '@/lib/redemptions'
import { ShoppingBag, Coins } from 'lucide-react'

export function ShopClient({ items, userPoints, username }: ShopClientProps) {
  const t = useTranslations('shop')
  const tCommon = useTranslations('common')
  const { user } = useAuth()
  const [redeemedItems, setRedeemedItems] = useState<Map<string, number>>(new Map()) // itemId -> pointsCost
  const [showConfirmation, setShowConfirmation] = useState<{
    itemId: string
    itemName: string
    pointsCost: number
    selectedPlayer?: FavoritePlayerOption
  } | null>(null)
  const [showPlayerPicker, setShowPlayerPicker] = useState<ShopItemType | null>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [redeemedItem, setRedeemedItem] = useState<ShopItemType | null>(null)
  const [redemptionId, setRedemptionId] = useState<string | null>(null)
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<FavoritePlayerOption | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate available points (subtract redeemed items)
  const getAvailablePoints = () => {
    let totalRedeemed = 0
    redeemedItems.forEach((cost) => {
      totalRedeemed += cost
    })
    return userPoints - totalRedeemed
  }

  const handleRedeem = (itemId: string) => {
    const item = items.find((i) => i.itemId === itemId)
    if (!item) return

    // Check if already redeemed this session
    if (redeemedItems.has(itemId)) {
      return
    }

    // Check if user can afford (for favorite-player, pointsCost is the minimum)
    const availablePoints = getAvailablePoints()
    if (availablePoints < item.pointsCost) {
      return
    }

    // Favorite-player items: show player picker first
    if (isFavoritePlayerCustomization(item.customization)) {
      setShowPlayerPicker(item)
      return
    }

    // Show confirmation dialog
    setShowConfirmation({
      itemId: item.itemId,
      itemName: item.name,
      pointsCost: item.pointsCost,
    })
  }

  const handlePlayerSelected = (item: ShopItemType, selectedPlayer: FavoritePlayerOption) => {
    setShowPlayerPicker(null)
    setShowConfirmation({
      itemId: item.itemId,
      itemName: item.name,
      pointsCost: selectedPlayer.pointsCost,
      selectedPlayer,
    })
  }

  const confirmRedeem = async () => {
    if (!showConfirmation || !user) return

    const item = items.find((i) => i.itemId === showConfirmation.itemId)
    if (!item) {
      setError('Item not found')
      setShowConfirmation(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Redeem the item (with selectedPlayer for favorite-player items)
      const result = await redeemShopItem(user, item, showConfirmation.selectedPlayer)

      // Mark as redeemed locally (store actual cost for favorite-player items)
      const actualCost = showConfirmation.selectedPlayer?.pointsCost ?? item.pointsCost
      setRedeemedItems((prev) => new Map(prev).set(item.itemId, actualCost))

      // Store redemption info for action modal
      setRedeemedItem(item)
      setRedemptionId(result.redemptionId)

      // Close confirmation and show action modal
      setShowConfirmation(null)
      
      // Check if item requires an action (display name change, favorite player selection)
      const itemNameLower = item.name.toLowerCase()
      const isFavoritePlayer = isFavoritePlayerCustomization(item.customization)
      if (itemNameLower.includes('display name') || itemNameLower.includes('change name')) {
        setShowActionModal(true)
      } else if (isFavoritePlayer) {
        setSelectedPlayerForModal(showConfirmation.selectedPlayer ?? null)
        setShowActionModal(true)
      } else {
        // For items that don't require action, just show success
        // You could show a success toast here
        onRedemptionComplete()
      }
    } catch (err: any) {
      console.error('Error redeeming item:', err)
      setError(err.message || 'Failed to redeem item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onRedemptionComplete = () => {
    setShowActionModal(false)
    setRedeemedItem(null)
    setRedemptionId(null)
    setSelectedPlayerForModal(null)
    // Refresh user points by reloading or calling a refresh function
    // For now, the parent component should handle this
    window.location.reload() // Simple refresh - you might want to use a better approach
  }

  const cancelRedeem = () => {
    setShowConfirmation(null)
  }

  const cancelPlayerPicker = () => {
    setShowPlayerPicker(null)
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
      <main className="flex-1 px-4 sm:px-5 pb-bottom-nav py-4 sm:py-5 overflow-x-hidden">
        {/* Title Section */}
        <div className="w-full flex flex-col items-center gap-2 mb-6">
          <ShoppingBag className="w-12 h-12 text-lime-yellow mb-2" />
          <h1 className="text-3xl sm:text-4xl font-bold text-ivory">{t('title')}</h1>
          <p className="text-ivory/70 text-sm sm:text-base text-center">
            {t('subtitle')}
          </p>
        </div>

        {/* Points Balance Card */}
        <div className="w-full max-w-2xl mx-auto mb-6 bg-lime-yellow rounded-lg px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <Coins className="w-5 h-5 text-midnight-violet" />
            <span className="text-midnight-violet font-semibold text-sm">
              {t('shopPoints')}
            </span>
            <span className="text-midnight-violet font-bold text-xl">
              {getAvailablePoints().toLocaleString()}
            </span>
          </div>
        </div>

        {/* Items Grid */}
        {activeItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ivory/70 text-lg">{t('noItems')}</p>
            <p className="text-ivory/50 text-sm mt-2">{t('checkBack')}</p>
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

      {/* Player Picker Modal (for Favorite Player items) */}
      {showPlayerPicker && isFavoritePlayerCustomization(showPlayerPicker.customization) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-midnight-violet border-2 border-lime-yellow rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <h3 className="text-ivory font-bold text-xl mb-2">{t('choosePlayer')}</h3>
            <p className="text-ivory/70 text-sm mb-4">
              {t('choosePlayerDescription')}
            </p>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {[...showPlayerPicker.customization.playerOptions]
                .sort((a, b) => a.pointsCost - b.pointsCost)
                .map((player) => {
                const canAfford = getAvailablePoints() >= player.pointsCost
                return (
                  <button
                    key={player.playerId}
                    onClick={() => canAfford && handlePlayerSelected(showPlayerPicker, player)}
                    disabled={!canAfford}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      canAfford
                        ? 'bg-gray-800/50 border-gray-600 hover:border-lime-yellow hover:bg-gray-800 text-ivory'
                        : 'bg-gray-800/30 border-gray-700 text-ivory/50 cursor-not-allowed'
                    }`}
                  >
                    <img src={player.photo} alt={player.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                    <span className="flex-1 text-left font-medium">{player.name}</span>
                    <span className={`font-bold ${canAfford ? 'text-lime-yellow' : 'text-ivory/50'}`}>
                      {player.pointsCost} {t('pts')}
                    </span>
                  </button>
                )
              })}
            </div>
            <button
              onClick={cancelPlayerPicker}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-ivory/10 text-ivory hover:bg-ivory/15 transition-colors"
            >
              {tCommon('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-midnight-violet border-2 border-lime-yellow rounded-lg p-6 max-w-md w-full">
            <h3 className="text-ivory font-bold text-xl mb-2">{t('confirmRedemption')}</h3>
            <p className="text-ivory/70 mb-4">
              {t('confirmRedemptionText', {
                itemName: showConfirmation.itemName,
                pointsCost: showConfirmation.pointsCost,
              })}
            </p>
            {error && (
              <div className="mb-4 p-3 bg-cinnabar bg-opacity-20 border border-cinnabar rounded-lg">
                <p className="text-sm text-cinnabar">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={cancelRedeem}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-ivory/10 text-ivory hover:bg-ivory/15 transition-colors disabled:opacity-50"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={confirmRedeem}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Processing...
                  </>
                ) : (
                  tCommon('confirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redemption Action Modal */}
      <RedemptionActionModal
        isOpen={showActionModal}
        item={redeemedItem}
        redemptionId={redemptionId}
        selectedPlayer={selectedPlayerForModal}
        onClose={onRedemptionComplete}
        onSuccess={onRedemptionComplete}
      />
    </div>
  )
}
