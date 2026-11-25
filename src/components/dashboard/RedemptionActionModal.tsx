'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ShopItem, FavoritePlayerOption, isFavoritePlayerCustomization } from '@/types/shop'
import { useAuth } from '@/lib/AuthProvider'
import { updateProfile } from 'firebase/auth'
import { isDisplayNameAvailable, updateUserDisplayName, updateUserFavoritePlayer } from '@/lib/users'
import { updateRedemptionStatus } from '@/lib/redemptions'
import { X, Loader2, Check } from 'lucide-react'

interface RedemptionActionModalProps {
  isOpen: boolean
  item: ShopItem | null
  redemptionId: string | null
  selectedPlayer?: FavoritePlayerOption | null
  onClose: () => void
  onSuccess: () => void
}

export function RedemptionActionModal({
  isOpen,
  item,
  redemptionId,
  selectedPlayer,
  onClose,
  onSuccess,
}: RedemptionActionModalProps) {
  const t = useTranslations('shop')
  const tCommon = useTranslations('common')
  const { user } = useAuth()
  const [step, setStep] = useState<'action' | 'success'>('action')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Display name change state
  const [newDisplayName, setNewDisplayName] = useState('')
  const [displayNameError, setDisplayNameError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && item) {
      setStep('action')
      setError(null)
      setDisplayNameError(null)
      setNewDisplayName('')
    }
  }, [isOpen, item])

  if (!isOpen || !item || !user) return null

  const validateDisplayName = (name: string): string | null => {
    if (!name || name.trim().length === 0) {
      return t('displayNameRequired')
    }
    if (name.trim().length < 2) {
      return t('displayNameMinLength')
    }
    if (name.trim().length > 30) {
      return t('displayNameMaxLength')
    }
    const validPattern = /^[a-zA-Z0-9 _-]+$/
    if (!validPattern.test(name)) {
      return t('displayNameInvalidChars')
    }
    return null
  }

  const handleDisplayNameChange = async () => {
    if (!user || !redemptionId) return

    // Validate display name
    const validationError = validateDisplayName(newDisplayName)
    if (validationError) {
      setDisplayNameError(validationError)
      return
    }

    const trimmedName = newDisplayName.trim()

    setLoading(true)
    setError(null)
    setDisplayNameError(null)

    try {
      // Check if display name is available
      const isAvailable = await isDisplayNameAvailable(trimmedName, user.uid)
      if (!isAvailable) {
        setDisplayNameError(t('displayNameTakenShop'))
        setLoading(false)
        return
      }

      await updateProfile(user, { displayName: trimmedName })
      await updateUserDisplayName(user, trimmedName)

      // Mark redemption as fulfilled
      await updateRedemptionStatus(redemptionId, 'fulfilled')

      setStep('success')
    } catch (err: any) {
      console.error('Error changing display name:', err)
      setError(err.message || t('failedChangeDisplayName'))
    } finally {
      setLoading(false)
    }
  }

  const handleFavoritePlayerAdd = async () => {
    if (!user || !selectedPlayer || !redemptionId) return

    setLoading(true)
    setError(null)

    try {
      await updateUserFavoritePlayer(
        user.uid,
        {
          id: selectedPlayer.playerId,
          name: selectedPlayer.name,
          photo: selectedPlayer.photo,
        },
        redemptionId
      )
      setStep('success')
    } catch (err: any) {
      console.error('Error adding favorite player:', err)
      setError(err.message || t('failedAddFavoritePlayer'))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // If user closes without completing action, still mark as fulfilled
    // (points were already deducted, redemption is complete)
    if (step === 'action' && redemptionId) {
      updateRedemptionStatus(redemptionId, 'fulfilled').catch(console.error)
    }
    if (step === 'success') {
      onSuccess()
    }
    onClose()
  }

  // Determine which action modal to show based on item
  const getActionType = (): string | null => {
    if (!item) return null
    if (isFavoritePlayerCustomization(item.customization) && selectedPlayer) {
      return 'favoritePlayer'
    }
    const nameLower = item.name?.toLowerCase() ?? ''
    if (nameLower.includes('display name') || nameLower.includes('change name')) {
      return 'displayName'
    }
    return null
  }

  const actionType = getActionType()

  // If no specific action type, show generic success
  if (!actionType) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-midnight-violet border-2 border-lime-yellow rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-ivory font-bold text-xl">{t('redemptionSuccess')}</h3>
            <button
              onClick={handleClose}
              className="text-ivory hover:text-lime-yellow transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-ivory/70 mb-4">
            {t('redemptionSuccessText', { itemName: item.name })}
          </p>
          <button
            onClick={handleClose}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 transition-colors"
          >
            {tCommon('close')}
          </button>
        </div>
      </div>
    )
  }

  // Favorite Player Modal
  if (actionType === 'favoritePlayer' && selectedPlayer) {
    if (step === 'success') {
      return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-midnight-violet border-2 border-lime-yellow rounded-lg p-6 max-w-md w-full">
            <div className="flex flex-col items-center text-center mb-4">
              <img
                src={selectedPlayer.photo}
                alt={selectedPlayer.name}
                width={80}
                height={80}
                loading="lazy"
                decoding="async"
                className="w-20 h-20 rounded-full object-cover mb-4 border-2 border-lime-yellow"
              />
              <h3 className="text-ivory font-bold text-xl mb-2">{t('favoritePlayerAdded')}</h3>
              <p className="text-ivory/70">
                {t('favoritePlayerAddedDescription', { name: selectedPlayer.name })}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 transition-colors"
            >
              {t('done')}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-midnight-violet border-2 border-lime-yellow rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-ivory font-bold text-xl">{t('addFavoritePlayer')}</h3>
            <button
              onClick={onClose}
              className="text-ivory hover:text-lime-yellow transition-colors"
              disabled={loading}
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center mb-4">
            <img
              src={selectedPlayer.photo}
              alt={selectedPlayer.name}
              width={96}
              height={96}
              loading="lazy"
              decoding="async"
              className="w-24 h-24 rounded-full object-cover mb-3 border-2 border-lime-yellow"
            />
            <p className="text-ivory font-semibold text-lg">{selectedPlayer.name}</p>
            <p className="text-ivory/70 text-sm">
              {t('addFavoritePlayerConfirm')}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-cinnabar bg-opacity-20 border border-cinnabar rounded-lg">
              <p className="text-sm text-cinnabar">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-ivory/10 text-ivory hover:bg-ivory/15 transition-colors disabled:opacity-50"
              title="Close (redemption will still be marked complete)"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={handleFavoritePlayerAdd}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {t('adding')}
                </>
              ) : (
                t('addToProfile')
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Display Name Change Modal
  if (actionType === 'displayName') {
    if (step === 'success') {
      return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-midnight-violet border-2 border-lime-yellow rounded-lg p-6 max-w-md w-full">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 bg-lime-yellow rounded-full flex items-center justify-center mb-4">
                <Check className="text-midnight-violet" size={32} />
              </div>
              <h3 className="text-ivory font-bold text-xl mb-2">{t('displayNameChangedTitle')}</h3>
              <p className="text-ivory/70">
                {t('displayNameChangedText', { name: newDisplayName.trim() })}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 transition-colors"
            >
              {t('done')}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-midnight-violet border-2 border-lime-yellow rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-ivory font-bold text-xl">{t('changeDisplayNameTitle')}</h3>
            <button
              onClick={onClose}
              className="text-ivory hover:text-lime-yellow transition-colors"
              disabled={loading}
            >
              <X size={24} />
            </button>
          </div>

          <p className="text-ivory/70 mb-4">
            {t('changeDisplayNameIntro', { itemName: item.name })}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-cinnabar bg-opacity-20 border border-cinnabar rounded-lg">
              <p className="text-sm text-cinnabar">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm text-ivory mb-2">
              {t('newDisplayNameLabel')} <span className="text-cinnabar">*</span>
            </label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => {
                setNewDisplayName(e.target.value)
                setDisplayNameError(null)
              }}
              onBlur={() => {
                if (newDisplayName.trim()) {
                  const error = validateDisplayName(newDisplayName)
                  setDisplayNameError(error)
                }
              }}
              placeholder={t('displayNamePlaceholder')}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-ivory focus:outline-none focus:border-lime-yellow"
              disabled={loading}
              maxLength={30}
            />
            {displayNameError && (
              <p className="text-xs text-cinnabar mt-1">{displayNameError}</p>
            )}
            <p className="text-xs text-ivory/50 mt-1">{t('displayNameHint')}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-ivory/10 text-ivory hover:bg-ivory/15 transition-colors disabled:opacity-50"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={handleDisplayNameChange}
              disabled={loading || !newDisplayName.trim()}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {t('updating')}
                </>
              ) : (
                t('changeNameButton')
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Default: generic success
  return null
}
