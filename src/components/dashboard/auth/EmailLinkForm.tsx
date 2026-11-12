'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { mapFirebaseAuthError, sendEmailSignInLink } from '@/lib/auth-email'

interface EmailLinkFormProps {
  onError: (message: string) => void
}

export function EmailLinkForm({ onError }: EmailLinkFormProps) {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const mapError = (code: string | undefined) => {
    const key = mapFirebaseAuthError(code)
    return t(`emailError.${key}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onError('')
    setLoading(true)
    setSent(false)

    try {
      await sendEmailSignInLink(email)
      setSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      onError(mapError(code))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold text-midnight-violet">{t('emailLinkSentTitle')}</p>
        <p className="text-xs text-midnight-violet/80">{t('emailLinkSentDescription')}</p>
        <p className="text-xs text-midnight-violet/70">{t('emailLinkSameBrowserNote')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-x-hidden">
      <p className="text-xs sm:text-sm text-midnight-violet text-opacity-80">{t('emailLinkDescription')}</p>
      <div>
        <label htmlFor="auth-email-link" className="block text-sm font-semibold text-midnight-violet mb-2">
          {t('emailAddress')}
        </label>
        <input
          id="auth-email-link"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2.5 min-h-[44px] rounded border border-midnight-violet text-midnight-violet focus:outline-none focus:ring-2 focus:ring-midnight-violet text-base"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-midnight-violet text-lime-yellow py-3 px-4 rounded font-semibold disabled:opacity-50 min-h-[44px]"
      >
        {loading ? t('sendingEmailLink') : t('sendEmailLink')}
      </button>
    </form>
  )
}
