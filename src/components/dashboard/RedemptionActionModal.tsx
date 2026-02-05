'use client'

import { useState, useEffect } from 'react'
import { ShopItem } from '@/types/shop'
import { useAuth } from '@/lib/AuthProvider'
import { updateProfile } from 'firebase/auth'
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { isDisplayNameAvailable } from '@/lib/users'
import { updateRedemptionStatus } from '@/lib/redemptions'
import { X, Loader2, Check } from 'lucide-react'

interface RedemptionActionModalProps {
  isOpen: boolean
  item: ShopItem | null
  redemptionId: string | null
  onClose: () => void
  onSuccess: () => void
}

export function RedemptionActionModal({
  isOpen,
  item,
  redemptionId,
  onClose,
  onSuccess,
}: RedemptionActionModalProps) {
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
      return 'Display name is required'
    }
    if (name.trim().length < 2) {
      return 'Display name must be at least 2 characters'
    }
    if (name.trim().length > 30) {
      return 'Display name must be 30 characters or less'
    }
    // Allow letters, numbers, spaces, hyphens, and underscores
    const validPattern = /^[a-zA-Z0-9 _-]+$/
    if (!validPattern.test(name)) {
      return 'Display name can only contain letters, numbers, spaces, hyphens, and underscores'
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
        setDisplayNameError('This display name is already taken. Please choose another.')
        setLoading(false)
        return
      }

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: trimmedName })

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        displayName: trimmedName,
        lastUpdated: serverTimestamp(),
      })

      // Mark redemption as fulfilled
      await updateRedemptionStatus(redemptionId, 'fulfilled')

      setStep('success')
    } catch (err: any) {
      console.error('Error changing display name:', err)
      setError(err.message || 'Failed to change display name. Please try again.')
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
    if (!item.name) return null
    
    const nameLower = item.name.toLowerCase()
    if (nameLower.includes('display name') || nameLower.includes('change name')) {
      return 'displayName'
    }
    // Add more action types here as needed
    // if (nameLower.includes('theme')) return 'theme'
    // if (nameLower.includes('badge')) return 'badge'
    
    return null
  }

  const actionType = getActionType()

  // If no specific action type, show generic success
  if (!actionType) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-midnight-violet border-2 border-lime-yellow rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-ivory font-bold text-xl">Redemption Successful!</h3>
            <button
              onClick={handleClose}
              className="text-ivory hover:text-lime-yellow transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-ivory/70 mb-4">
            You have successfully redeemed: <strong>{item.name}</strong>
          </p>
          <button
            onClick={handleClose}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 transition-colors"
          >
            Close
          </button>
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
              <h3 className="text-ivory font-bold text-xl mb-2">Display Name Changed!</h3>
              <p className="text-ivory/70">
                Your display name has been successfully updated to <strong>{newDisplayName.trim()}</strong>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-midnight-violet border-2 border-lime-yellow rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-ivory font-bold text-xl">Change Display Name</h3>
            <button
              onClick={onClose}
              className="text-ivory hover:text-lime-yellow transition-colors"
              disabled={loading}
            >
              <X size={24} />
            </button>
          </div>

          <p className="text-ivory/70 mb-4">
            You've redeemed <strong>{item.name}</strong>. Enter your new display name below.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-cinnabar bg-opacity-20 border border-cinnabar rounded-lg">
              <p className="text-sm text-cinnabar">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm text-ivory mb-2">
              New Display Name <span className="text-cinnabar">*</span>
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
              placeholder="Enter your new display name"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-ivory focus:outline-none focus:border-lime-yellow"
              disabled={loading}
              maxLength={30}
            />
            {displayNameError && (
              <p className="text-xs text-cinnabar mt-1">{displayNameError}</p>
            )}
            <p className="text-xs text-ivory/50 mt-1">
              2-30 characters. Letters, numbers, spaces, hyphens, and underscores only.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-ivory/10 text-ivory hover:bg-ivory/15 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDisplayNameChange}
              disabled={loading || !newDisplayName.trim()}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Updating...
                </>
              ) : (
                'Change Name'
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
