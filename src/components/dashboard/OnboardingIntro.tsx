'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Target, Calendar, Trophy, ShoppingBag, ArrowRight, X, ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { updateProfile } from 'firebase/auth'
import { markOnboardingIntroSeen, ensureUserDocument, isDisplayNameAvailable } from '@/lib/users'
import { trackReferralSignup } from '@/lib/referrals'
import { getRandomSuggestions } from '@/data/displayNameSuggestions'

interface OnboardingIntroProps {
  isOpen: boolean
  onClose: () => void
  requiresDisplayName?: boolean // If true, show displayName step first
  referralCode?: string | null
}

export function OnboardingIntro({ isOpen, onClose, requiresDisplayName = false, referralCode = null }: OnboardingIntroProps) {
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const tSettings = useTranslations('settings')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'displayName' | 'instructions'>(requiresDisplayName ? 'displayName' : 'instructions')
  const [selectedDisplayName, setSelectedDisplayName] = useState<string>('')
  const [customDisplayName, setCustomDisplayName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [recommendedNames] = useState<string[]>(() => getRandomSuggestions(12))
  const router = useRouter()
  const pathname = usePathname()

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reset step when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // If requiresDisplayName is true, ALWAYS start with displayName step
      // This ensures new users always set their displayName, even if they have one in Firebase Auth
      const initialStep = requiresDisplayName ? 'displayName' : 'instructions'
      setStep(initialStep)
      setError(null)
      setSelectedDisplayName('')
      setCustomDisplayName('')
    } else {
      // Reset to initial state when closed
      setStep(requiresDisplayName ? 'displayName' : 'instructions')
    }
  }, [isOpen, requiresDisplayName])

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
    // Allow letters, numbers, spaces, hyphens, and underscores
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
      return t('displayNameInvalid')
    }
    return null
  }

  const handleDisplayNameSelect = (name: string) => {
    setSelectedDisplayName(name)
    setCustomDisplayName('')
    setError(null)
  }

  const handleDisplayNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const displayName = customDisplayName.trim() || selectedDisplayName
      const validationError = validateDisplayName(displayName)
      
      if (validationError) {
        setError(validationError)
        setLoading(false)
        return
      }

      const user = auth.currentUser
      if (!user) {
        throw new Error(t('noUserFoundSignIn'))
      }

      const trimmedDisplayName = displayName.trim()

      // Check if display name is available (case-insensitive)
      const isAvailable = await isDisplayNameAvailable(trimmedDisplayName, user.uid)
      if (!isAvailable) {
        setError(t('displayNameTaken'))
        setLoading(false)
        return
      }

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: trimmedDisplayName })

      // Save to Firestore (with referral code if present)
      await ensureUserDocument(user, trimmedDisplayName, referralCode || undefined)

      // Process referral if code was provided
      if (referralCode) {
        try {
          await trackReferralSignup(user.uid, referralCode)
        } catch (refError) {
          console.error('Error processing referral:', refError)
          // Don't fail signup if referral processing fails
        }
      }

      // Move to instructions step
      setStep('instructions')
    } catch (err: any) {
      setError(err.message || t('failedToUpdate'))
      console.error('Display name update error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (skip: boolean = false) => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (user) {
        await markOnboardingIntroSeen(user)
      }
      onClose()
      // Navigate to dashboard only if we're not already there
      if (pathname !== '/dashboard') {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error marking onboarding as seen:', error)
      // Still close even if there's an error
      onClose()
      // Navigate to dashboard only if we're not already there
      if (pathname !== '/dashboard') {
        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    handleComplete(true)
  }

  const handleStart = () => {
    handleComplete(false)
  }

  if (!isOpen || !mounted) {
    return null
  }

  // Use step directly - the useEffect should handle setting it correctly
  const currentStep = step

  const modalContent = (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto overflow-x-hidden"
      onClick={handleSkip}
      style={{ paddingTop: 'env(safe-area-inset-top, 1rem)', paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}
    >
      <div 
        className="bg-midnight-violet rounded-lg p-6 sm:p-8 w-full max-w-md my-auto shadow-xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-lime-yellow pr-2">
              {currentStep === 'displayName' ? t('chooseDisplayName') : t('welcome')}
            </h2>
            {currentStep === 'instructions' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-ivory/60">{t('step2Of2')}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleSkip}
            disabled={loading}
            className="text-ivory hover:text-lime-yellow text-2xl sm:text-3xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50"
            aria-label={tCommon('skip')}
          >
            <X size={24} />
          </button>
        </div>

        {/* Step Indicator */}
        {currentStep === 'displayName' && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-1 bg-lime-yellow rounded-full"></div>
            <div className="flex-1 h-1 bg-ivory/20 rounded-full"></div>
          </div>
        )}
        {currentStep === 'instructions' && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-1 bg-lime-yellow rounded-full"></div>
            <div className="flex-1 h-1 bg-lime-yellow rounded-full"></div>
          </div>
        )}

        {/* Display Name Step */}
        {currentStep === 'displayName' && (
          <form onSubmit={handleDisplayNameSubmit} className="space-y-4 overflow-x-hidden">
            <p className="text-ivory/80 text-sm sm:text-base mb-4">
              {t('displayNameDescription')}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-cinnabar text-ivory rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-ivory mb-2">
                {t('recommendedNames')}
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {recommendedNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleDisplayNameSelect(name)}
                    className={`px-4 py-2 rounded font-semibold text-sm min-h-[44px] transition-colors ${
                      selectedDisplayName === name && !customDisplayName.trim()
                        ? 'bg-lime-yellow text-midnight-violet'
                        : 'bg-ivory/10 text-ivory hover:bg-ivory/20'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="custom-display-name" className="block text-sm font-semibold text-ivory mb-2">
                {t('orEnterCustom')}
              </label>
              <input
                id="custom-display-name"
                type="text"
                value={customDisplayName}
                onChange={(e) => {
                  setCustomDisplayName(e.target.value)
                  setSelectedDisplayName('')
                }}
                placeholder={t('enterDisplayName')}
                maxLength={30}
                className="w-full px-4 py-2.5 min-h-[44px] rounded border border-ivory/30 text-ivory bg-midnight-violet focus:outline-none focus:ring-2 focus:ring-lime-yellow text-base"
              />
              <p className="mt-1 text-xs text-ivory/70">
                {t('displayNameRequirements')}
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || (!selectedDisplayName && !customDisplayName.trim())}
              className="w-full bg-lime-yellow text-midnight-violet py-3 px-4 rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-opacity-80 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? tSettings('saving') : tCommon('continue')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}

        {/* Instructions Step */}
        {currentStep === 'instructions' && (
          <>
            <p className="text-ivory/80 text-base sm:text-lg mb-8 leading-relaxed">
              {t('howItWorks')}
            </p>

            {/* Features List */}
            <div className="space-y-6 mb-8">
              {/* What Banger Picks is */}
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lime-yellow/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-lime-yellow" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-ivory mb-1">
                    {t('predictMatchResults')}
                  </h3>
                  <p className="text-ivory/70 text-sm sm:text-base">
                    {t('predictMatchDescription')}
                  </p>
                </div>
              </div>

              {/* Gameweeks */}
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lime-yellow/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-lime-yellow" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-ivory mb-1">
                    {t('weeklyGameweeks')}
                  </h3>
                  <p className="text-ivory/70 text-sm sm:text-base">
                    {t('weeklyGameweeksDescription')}
                  </p>
                </div>
              </div>

              {/* Points & Rankings */}
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lime-yellow/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-lime-yellow" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-ivory mb-1">
                    {t('pointsRankings')}
                  </h3>
                  <p className="text-ivory/70 text-sm sm:text-base">
                    {t('pointsRankingsDescription')}
                  </p>
                </div>
              </div>

              {/* Shop & Rewards */}
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lime-yellow/20 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-lime-yellow" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-ivory mb-1">
                    {t('shopRewards')}
                  </h3>
                  <p className="text-ivory/70 text-sm sm:text-base">
                    {t('shopRewardsDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleStart}
                disabled={loading}
                className="w-full bg-lime-yellow text-midnight-violet py-3 px-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-opacity-80 flex items-center justify-center gap-2 transition-colors"
              >
                {t('letsStart')}
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleSkip}
                disabled={loading}
                className="w-full text-ivory/70 hover:text-ivory text-sm sm:text-base py-2 min-h-[44px] flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {t('skipForNow')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
