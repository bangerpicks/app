'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Target, Calendar, Trophy, ShoppingBag, ArrowRight } from 'lucide-react'
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
  referralMessage?: string | null
  /** Local preview: walk the steps without writing Auth or Firestore. */
  previewOnly?: boolean
}

export function OnboardingIntro({ isOpen, onClose, requiresDisplayName = false, referralCode = null, referralMessage = null, previewOnly = false }: OnboardingIntroProps) {
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const tSettings = useTranslations('settings')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'displayName' | 'instructions'>(requiresDisplayName ? 'displayName' : 'instructions')
  const [selectedDisplayName, setSelectedDisplayName] = useState<string>('')
  const [customDisplayName, setCustomDisplayName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [referralStatus, setReferralStatus] = useState<string | null>(null)
  const [recommendedNames] = useState<string[]>(() => getRandomSuggestions(12))
  const router = useRouter()
  const pathname = usePathname()

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reset step when modal opens/closes; show referral message from parent if provided
  useEffect(() => {
    if (isOpen) {
      // If requiresDisplayName is true, ALWAYS start with displayName step
      // This ensures new users always set their displayName, even if they have one in Firebase Auth
      const initialStep = requiresDisplayName ? 'displayName' : 'instructions'
      setStep(initialStep)
      setError(null)
      setReferralStatus(referralMessage || null)
      setSelectedDisplayName('')
      setCustomDisplayName('')
    } else {
      // Reset to initial state when closed
      setStep(requiresDisplayName ? 'displayName' : 'instructions')
      setReferralStatus(null)
    }
  }, [isOpen, requiresDisplayName, referralMessage])

  useEffect(() => {
    if (!isOpen) return

    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const scrollbarWidth = window.innerWidth - html.clientWidth
    const prevBodyPaddingRight = body.style.paddingRight

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.paddingRight = prevBodyPaddingRight
    }
  }, [isOpen])

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

      const trimmedDisplayName = displayName.trim()

      if (previewOnly) {
        setStep('instructions')
        setLoading(false)
        return
      }

      const user = auth.currentUser
      if (!user) {
        throw new Error(t('noUserFoundSignIn'))
      }

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
          setReferralStatus('Referral applied! Your friend earned 5 points.')
        } catch (refError) {
          console.error('Error processing referral:', refError)
          setReferralStatus('Referral could not be applied. Contact support if needed.')
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

  const handleComplete = async () => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (user && !previewOnly) {
        await markOnboardingIntroSeen(user)
      }
      onClose()
      // Navigate to dashboard only if we're not already there
      const onDashboard =
        pathname === '/dashboard' || pathname === '/dashboard/'
      if (!onDashboard) {
        router.push('/dashboard/')
      }
    } catch (error) {
      console.error('Error marking onboarding as seen:', error)
      // Still close even if there's an error
      onClose()
      const onDashboard =
        pathname === '/dashboard' || pathname === '/dashboard/'
      if (!onDashboard) {
        router.push('/dashboard/')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStart = () => {
    handleComplete()
  }

  if (!mounted) {
    return null
  }

  // Use step directly - the useEffect should handle setting it correctly
  const currentStep = step

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-midnight-violet overflow-y-auto overflow-x-hidden overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="flex flex-col flex-1 w-full max-w-lg mx-auto p-4 sm:p-6 min-h-full">
        {/* Header */}
        <div className="mb-6 shrink-0">
          <div className="flex justify-center pt-1 pb-4">
            <Image
              src="/logo.svg"
              alt="Banger Picks"
              width={195}
              height={50}
              priority
              className="object-contain w-[156px] h-[40px] sm:w-[195px] sm:h-[50px]"
            />
          </div>
          <h2
            id="onboarding-title"
            className="text-xl sm:text-2xl font-bold text-lime-yellow text-center"
          >
            {currentStep === 'displayName' ? t('chooseDisplayName') : t('welcome')}
          </h2>
          {currentStep === 'instructions' && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs text-ivory/60">{t('step2Of2')}</span>
            </div>
          )}
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
          <form onSubmit={handleDisplayNameSubmit} className="space-y-4 overflow-x-hidden pb-6">
            <p className="text-ivory/80 text-sm sm:text-base mb-4 text-center">
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
                className="w-full px-4 py-2.5 min-h-[44px] rounded border border-ivory/30 text-ivory bg-midnight-violet focus:outline-none focus:ring-2 focus:ring-lime-yellow text-base placeholder:text-ivory/40"
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
          <div className="pb-6">
            {referralStatus && (
              <div
                className={`mb-6 p-3 rounded text-sm ${
                  referralStatus.includes('applied')
                    ? 'bg-lime-yellow/20 text-lime-yellow border border-lime-yellow/40'
                    : 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                }`}
              >
                {referralStatus}
              </div>
            )}
            <p className="text-ivory/80 text-base sm:text-lg mb-8 leading-relaxed text-center">
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
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null

  return <>{isOpen && createPortal(modalContent, document.body)}</>
}
