'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { AppShell } from '@/components/dashboard/AppShell'
import {
  completeEmailLinkSignIn,
  isEmailSignInLink,
  readStoredEmailForSignIn,
} from '@/lib/auth-email'
import { completeSignInAfterAuth } from '@/lib/auth-post-sign-in'

type PageState = 'loading' | 'needEmail' | 'error' | 'success'

export default function AuthContinuePage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [state, setState] = useState<PageState>('loading')
  const [emailInput, setEmailInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const finishSignIn = useCallback(
    async (emailForSignIn: string, link: string) => {
      setSubmitting(true)
      setError(null)
      try {
        const user = await completeEmailLinkSignIn(emailForSignIn, link)
        const referralCode =
          typeof window !== 'undefined' ? sessionStorage.getItem('referralCode') : null
        await completeSignInAfterAuth(user, { referralCode })
        setState('success')
        router.replace('/dashboard/')
      } catch (err: unknown) {
        console.error('Email link sign-in error:', err)
        setState('error')
        setError(t('emailLinkFailed'))
      } finally {
        setSubmitting(false)
      }
    },
    [router, t]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const link = window.location.href
    if (!isEmailSignInLink(link)) {
      setState('error')
      setError(t('emailLinkInvalid'))
      return
    }

    const stored = readStoredEmailForSignIn()
    if (stored) {
      void finishSignIn(stored, link)
    } else {
      setState('needEmail')
    }
  }, [finishSignIn, t])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = emailInput.trim()
    if (!trimmed) return
    await finishSignIn(trimmed, window.location.href)
  }

  return (
    <AppShell mainClassName="flex-1 px-4 sm:px-5 py-8 pb-bottom-nav lg:pb-8 flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto w-full overflow-x-hidden">
        {state === 'loading' && (
          <p className="text-ivory/80 text-sm">{t('emailLinkCompleting')}</p>
        )}

        {state === 'needEmail' && (
          <>
            <h1 className="text-xl font-bold text-ivory">{t('emailLinkConfirmTitle')}</h1>
            <p className="text-ivory/70 text-sm">{t('emailLinkConfirmDescription')}</p>
            {error ? (
              <div className="w-full p-3 bg-cinnabar/20 border border-cinnabar/40 rounded text-cinnabar text-sm">
                {error}
              </div>
            ) : null}
            <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-3">
              <input
                type="email"
                autoComplete="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={t('emailAddress')}
                required
                className="w-full px-4 py-2.5 min-h-[44px] rounded-lg border border-ivory/30 bg-midnight-violet text-ivory"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-lime-yellow text-midnight-violet py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {submitting ? t('signingIn') : tCommon('continue')}
              </button>
            </form>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-xl font-bold text-ivory">{t('emailLinkInvalidTitle')}</h1>
            <p className="text-ivory/70 text-sm">{error ?? t('emailLinkInvalid')}</p>
            <Link
              href="/dashboard/"
              className="mt-4 text-lime-yellow font-semibold hover:underline"
            >
              {t('backToDashboard')}
            </Link>
          </>
        )}

        {state === 'success' && (
          <p className="text-ivory/80 text-sm">{t('emailLinkSuccess')}</p>
        )}
    </AppShell>
  )
}
