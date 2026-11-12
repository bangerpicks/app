'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  mapFirebaseAuthError,
  sendPasswordResetEmailTo,
  signInWithEmailPassword,
  signUpWithEmailPassword,
} from '@/lib/auth-email'
import { completeSignInAfterAuth } from '@/lib/auth-post-sign-in'

interface EmailPasswordFormProps {
  referralCode: string | null
  onDone: (referralMessage: string | null) => void
  onError: (message: string) => void
  onReferralMessage: (message: string) => void
  onSuccessMessage: (message: string) => void
}

export function EmailPasswordForm({
  referralCode,
  onDone,
  onError,
  onReferralMessage,
  onSuccessMessage,
}: EmailPasswordFormProps) {
  const t = useTranslations('auth')
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const mapError = (code: string | undefined) => {
    const key = mapFirebaseAuthError(code)
    return t(`emailError.${key}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onError('')
    setResetSent(false)
    setLoading(true)

    try {
      if (password.length < 6) {
        onError(t('emailError.weakPassword'))
        return
      }

      const user =
        mode === 'signUp'
          ? await signUpWithEmailPassword(email, password)
          : await signInWithEmailPassword(email, password)

      const { referralMessage } = await completeSignInAfterAuth(user, { referralCode })

      if (mode === 'signUp') {
        onSuccessMessage(t('verificationEmailSent'))
      }

      if (referralMessage) {
        onReferralMessage(referralMessage)
        await new Promise((r) => setTimeout(r, 2000))
      }
      onDone(referralMessage)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      onError(mapError(code))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    onError('')
    if (!email.trim()) {
      onError(t('emailEnterForReset'))
      return
    }
    setLoading(true)
    try {
      await sendPasswordResetEmailTo(email)
      setResetSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      onError(mapError(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-x-hidden">
      <p className="text-xs sm:text-sm text-midnight-violet text-opacity-80">
        {mode === 'signIn' ? t('emailPasswordSignInDescription') : t('emailPasswordSignUpDescription')}
      </p>

      <div className="flex gap-2 p-0.5 rounded-lg bg-midnight-violet/10">
        <button
          type="button"
          onClick={() => setMode('signIn')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
            mode === 'signIn'
              ? 'bg-midnight-violet text-lime-yellow'
              : 'text-midnight-violet/80'
          }`}
        >
          {t('emailSignIn')}
        </button>
        <button
          type="button"
          onClick={() => setMode('signUp')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
            mode === 'signUp'
              ? 'bg-midnight-violet text-lime-yellow'
              : 'text-midnight-violet/80'
          }`}
        >
          {t('emailSignUp')}
        </button>
      </div>

      <div>
        <label htmlFor="auth-email" className="block text-sm font-semibold text-midnight-violet mb-2">
          {t('emailAddress')}
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2.5 min-h-[44px] rounded border border-midnight-violet text-midnight-violet focus:outline-none focus:ring-2 focus:ring-midnight-violet text-base"
        />
      </div>

      <div>
        <label htmlFor="auth-password" className="block text-sm font-semibold text-midnight-violet mb-2">
          {t('password')}
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2.5 min-h-[44px] rounded border border-midnight-violet text-midnight-violet focus:outline-none focus:ring-2 focus:ring-midnight-violet text-base"
        />
      </div>

      {mode === 'signIn' ? (
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={loading}
          className="text-sm text-midnight-violet/80 hover:underline text-left"
        >
          {t('forgotPassword')}
        </button>
      ) : null}

      {resetSent ? (
        <p className="text-sm text-midnight-violet font-medium">{t('passwordResetSent')}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-midnight-violet text-lime-yellow py-3 px-4 rounded font-semibold disabled:opacity-50 min-h-[44px]"
      >
        {loading
          ? t('signingIn')
          : mode === 'signUp'
            ? t('emailCreateAccount')
            : t('emailSignInButton')}
      </button>
    </form>
  )
}
