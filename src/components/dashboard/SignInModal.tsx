'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { ensureUserDocument } from '@/lib/users'
import { getRandomSuggestions } from '@/data/displayNameSuggestions'

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
}

const COUNTRY_CODES = [
  { code: '+1', country: 'US', label: '+1 (US)' },
  { code: '+44', country: 'GB', label: '+44 (UK)' },
  { code: '+61', country: 'AU', label: '+61 (AU)' },
  { code: '+1', country: 'CA', label: '+1 (CA)' },
  { code: '+49', country: 'DE', label: '+49 (DE)' },
  { code: '+33', country: 'FR', label: '+33 (FR)' },
  { code: '+39', country: 'IT', label: '+39 (IT)' },
  { code: '+34', country: 'ES', label: '+34 (ES)' },
  { code: '+31', country: 'NL', label: '+31 (NL)' },
  { code: '+32', country: 'BE', label: '+32 (BE)' },
  { code: '+41', country: 'CH', label: '+41 (CH)' },
  { code: '+46', country: 'SE', label: '+46 (SE)' },
  { code: '+47', country: 'NO', label: '+47 (NO)' },
  { code: '+45', country: 'DK', label: '+45 (DK)' },
  { code: '+358', country: 'FI', label: '+358 (FI)' },
  { code: '+351', country: 'PT', label: '+351 (PT)' },
  { code: '+353', country: 'IE', label: '+353 (IE)' },
  { code: '+52', country: 'MX', label: '+52 (MX)' },
  { code: '+55', country: 'BR', label: '+55 (BR)' },
  { code: '+54', country: 'AR', label: '+54 (AR)' },
  { code: '+27', country: 'ZA', label: '+27 (ZA)' },
  { code: '+91', country: 'IN', label: '+91 (IN)' },
  { code: '+86', country: 'CN', label: '+86 (CN)' },
  { code: '+81', country: 'JP', label: '+81 (JP)' },
  { code: '+82', country: 'KR', label: '+82 (KR)' },
  { code: '+65', country: 'SG', label: '+65 (SG)' },
  { code: '+60', country: 'MY', label: '+60 (MY)' },
  { code: '+971', country: 'AE', label: '+971 (AE)' },
  { code: '+966', country: 'SA', label: '+966 (SA)' },
  { code: '+64', country: 'NZ', label: '+64 (NZ)' },
]

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [countryCode, setCountryCode] = useState('+1')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code' | 'displayName'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedDisplayName, setSelectedDisplayName] = useState<string>('')
  const [customDisplayName, setCustomDisplayName] = useState<string>('')
  const [recommendedNames] = useState<string[]>(() => getRandomSuggestions(12))

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Cleanup reCAPTCHA when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
        recaptchaVerifierRef.current = null
      }
    }
  }, [])

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Clear existing verifier if any
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
      }

      // Initialize reCAPTCHA verifier
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current || 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved, will allow signInWithPhoneNumber
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.')
          setLoading(false)
        }
      })

      recaptchaVerifierRef.current = verifier

      // Format phone number with selected country code
      const formattedPhone = `${countryCode}${phoneNumber.replace(/^\+/, '')}`
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier)
      setConfirmationResult(confirmation)
      setStep('code')
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code')
      console.error('Phone auth error:', err)
      // Clear verifier on error
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
        recaptchaVerifierRef.current = null
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!confirmationResult) {
        throw new Error('No confirmation result available')
      }

      const result = await confirmationResult.confirm(verificationCode)
      // Success - Firebase Auth state will update automatically
      // Check if user has displayName, if not, show displayName step
      if (result.user && !result.user.displayName) {
        setStep('displayName')
      } else {
        onClose()
        resetForm()
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code')
      console.error('Code verification error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisplayNameSelect = (name: string) => {
    setSelectedDisplayName(name)
    setCustomDisplayName('')
  }

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
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
      return 'Display name can only contain letters, numbers, spaces, hyphens, and underscores'
    }
    return null
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
        throw new Error('No user found. Please sign in again.')
      }

      const trimmedDisplayName = displayName.trim()

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: trimmedDisplayName })

      // Save to Firestore
      await ensureUserDocument(user, trimmedDisplayName)

      // Success - Firebase Auth state will update automatically
      onClose()
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to update display name')
      console.error('Display name update error:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCountryCode('+1')
    setPhoneNumber('')
    setVerificationCode('')
    setStep('phone')
    setError(null)
    setSelectedDisplayName('')
    setCustomDisplayName('')
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear()
      recaptchaVerifierRef.current = null
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto overflow-x-hidden"
      onClick={handleClose}
      style={{ paddingTop: 'env(safe-area-inset-top, 1rem)', paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}
    >
      <div 
        className="bg-lime-yellow rounded-lg p-4 sm:p-6 w-full max-w-md my-auto shadow-xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-midnight-violet pr-2">
            {step === 'phone' ? 'Sign In / Sign Up' : step === 'code' ? 'Verify Code' : 'Choose Display Name'}
          </h2>
          <button
            onClick={handleClose}
            className="text-midnight-violet hover:text-opacity-70 text-2xl sm:text-3xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {step === 'phone' && (
          <p className="mb-4 text-xs sm:text-sm text-midnight-violet text-opacity-80">
            Enter your phone number to sign in or create an account. We'll send you a verification code.
          </p>
        )}

        {step === 'displayName' && (
          <p className="mb-4 text-xs sm:text-sm text-midnight-violet text-opacity-80">
            Choose a display name that others will see. You can select a recommendation or enter your own.
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 bg-cinnabar text-ivory rounded text-sm">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4 overflow-x-hidden">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-midnight-violet mb-2">
                Phone Number
              </label>
              <div className="flex gap-2 min-w-0">
                <select
                  id="country-code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-2 py-2.5 min-h-[44px] rounded border border-midnight-violet text-midnight-violet bg-lime-yellow focus:outline-none focus:ring-2 focus:ring-midnight-violet font-semibold text-sm flex-shrink-0 w-24 max-w-24"
                >
                  {COUNTRY_CODES.map((country, index) => (
                    <option key={`${country.code}-${country.country}-${index}`} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234567890"
                  required
                  className="flex-1 px-4 py-2.5 min-h-[44px] rounded border border-midnight-violet text-midnight-violet focus:outline-none focus:ring-2 focus:ring-midnight-violet text-base min-w-0"
                />
              </div>
            </div>
            <div ref={recaptchaContainerRef} id="recaptcha-container"></div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-midnight-violet text-lime-yellow py-3 px-4 rounded font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-opacity-80"
            >
              {loading ? 'Sending Code...' : 'Continue'}
            </button>
            <p className="text-xs text-center text-midnight-violet text-opacity-60">
              By continuing, you agree to receive SMS messages for verification. Message and data rates may apply.
            </p>
          </form>
        ) : step === 'code' ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4 overflow-x-hidden">
            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-midnight-violet mb-2">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                maxLength={6}
                className="w-full px-4 py-2.5 min-h-[44px] rounded border border-midnight-violet text-midnight-violet focus:outline-none focus:ring-2 focus:ring-midnight-violet text-base text-center tracking-widest"
              />
              <p className="mt-1 text-xs text-midnight-violet text-opacity-70">
                Enter the 6-digit code sent to your phone
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-midnight-violet text-lime-yellow py-3 px-4 rounded font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-opacity-80"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setVerificationCode('')
                setError(null)
              }}
              className="w-full text-midnight-violet text-sm hover:underline py-2 min-h-[44px] flex items-center justify-center"
            >
              Change phone number
            </button>
          </form>
        ) : (
          <form onSubmit={handleDisplayNameSubmit} className="space-y-4 overflow-x-hidden">
            <div>
              <label className="block text-sm font-semibold text-midnight-violet mb-2">
                Recommended Display Names
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {recommendedNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleDisplayNameSelect(name)}
                    className={`px-4 py-2 rounded font-semibold text-sm min-h-[44px] transition-colors ${
                      selectedDisplayName === name && !customDisplayName.trim()
                        ? 'bg-midnight-violet text-lime-yellow'
                        : 'bg-midnight-violet/10 text-midnight-violet hover:bg-midnight-violet/20'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="custom-display-name" className="block text-sm font-semibold text-midnight-violet mb-2">
                Or Enter Custom Display Name
              </label>
              <input
                id="custom-display-name"
                type="text"
                value={customDisplayName}
                onChange={(e) => {
                  setCustomDisplayName(e.target.value)
                  setSelectedDisplayName('')
                }}
                placeholder="Enter your display name"
                maxLength={30}
                className="w-full px-4 py-2.5 min-h-[44px] rounded border border-midnight-violet text-midnight-violet focus:outline-none focus:ring-2 focus:ring-midnight-violet text-base"
              />
              <p className="mt-1 text-xs text-midnight-violet text-opacity-70">
                Must be 2-30 characters. Letters, numbers, spaces, hyphens, and underscores only.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || (!selectedDisplayName && !customDisplayName.trim())}
              className="w-full bg-midnight-violet text-lime-yellow py-3 px-4 rounded font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-opacity-80"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
