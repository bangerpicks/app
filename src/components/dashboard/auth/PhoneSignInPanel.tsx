'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { completeSignInAfterAuth } from '@/lib/auth-post-sign-in'
import { COUNTRY_CODES } from './phone-country-codes'

interface PhoneSignInPanelProps {
  referralCode: string | null
  onDone: (referralMessage: string | null) => void
  onError: (message: string) => void
  onReferralMessage: (message: string) => void
}

export function PhoneSignInPanel({
  referralCode,
  onDone,
  onError,
  onReferralMessage,
}: PhoneSignInPanelProps) {
  const t = useTranslations('auth')
  const [countryCode, setCountryCode] = useState('+1')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear()
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null
      }
    }
  }, [])

  const clearRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear()
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onError('')
    setLoading(true)

    try {
      if (!recaptchaContainerRef.current) {
        throw new Error(t('recaptchaContainerMissing'))
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
      clearRecaptcha()

      const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          onError(t('recaptchaExpired'))
          setLoading(false)
          clearRecaptcha()
        },
      })

      recaptchaVerifierRef.current = verifier
      const formattedPhone = `${countryCode}${phoneNumber.replace(/^\+/, '')}`

      const confirmationPromise = signInWithPhoneNumber(auth, formattedPhone, verifier)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(t('verificationCodeTimeout'))), 30000)
      )

      const confirmation = (await Promise.race([confirmationPromise, timeoutPromise])) as ConfirmationResult
      setConfirmationResult(confirmation)
      setStep('code')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      let errorMessage = t('failedToSendCode')
      if (code === 'auth/invalid-app-credential') {
        errorMessage = t('phoneAuthMisconfigured')
      } else if (code === 'auth/invalid-phone-number') {
        errorMessage = t('invalidPhoneNumber')
      } else if (code === 'auth/too-many-requests') {
        errorMessage = t('tooManyRequests')
      } else if (code === 'auth/quota-exceeded') {
        errorMessage = t('smsQuotaExceeded')
      } else if (err instanceof Error && err.message) {
        errorMessage = err.message
      }
      onError(errorMessage)
      clearRecaptcha()
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onError('')
    setLoading(true)

    try {
      if (!confirmationResult) {
        throw new Error(t('noConfirmationResult'))
      }

      const result = await confirmationResult.confirm(verificationCode)
      const user = result.user
      if (!user) {
        throw new Error(t('noUserFound'))
      }

      const { referralMessage } = await completeSignInAfterAuth(user, { referralCode })
      if (referralMessage) {
        onReferralMessage(referralMessage)
        await new Promise((r) => setTimeout(r, 2000))
      }
      onDone(referralMessage)
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : t('invalidCode'))
    } finally {
      setLoading(false)
    }
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleCodeSubmit} className="space-y-4 overflow-x-hidden">
        <p className="text-xs sm:text-sm text-midnight-violet text-opacity-80">
          {t('codeDescription', { phoneNumber: `${countryCode}${phoneNumber}` })}
        </p>
        <div>
          <label htmlFor="code" className="block text-sm font-semibold text-midnight-violet mb-2">
            {t('enterCode')}
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
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-midnight-violet text-lime-yellow py-3 px-4 rounded font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {loading ? t('verifying') : t('verify')}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep('phone')
            setVerificationCode('')
            onError('')
          }}
          className="w-full text-midnight-violet text-sm hover:underline py-2 min-h-[44px]"
        >
          {t('changePhoneNumber')}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handlePhoneSubmit} className="space-y-4 overflow-x-hidden">
      <p className="text-xs sm:text-sm text-midnight-violet text-opacity-80">{t('phoneNumberDescription')}</p>
      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-midnight-violet mb-2">
          {t('phoneNumber')}
        </label>
        <div className="flex gap-2 min-w-0">
          <select
            id="country-code"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="px-2 py-2.5 min-h-[44px] rounded border border-midnight-violet text-midnight-violet bg-lime-yellow focus:outline-none focus:ring-2 focus:ring-midnight-violet font-semibold text-sm flex-shrink-0 w-24"
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
      <div
        ref={recaptchaContainerRef}
        id="recaptcha-container"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', visibility: 'hidden' }}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-midnight-violet text-lime-yellow py-3 px-4 rounded font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        {loading ? t('sendingCode') : t('sendCode')}
      </button>
      <p className="text-xs text-center text-midnight-violet text-opacity-60">{t('smsDisclaimer')}</p>
    </form>
  )
}
