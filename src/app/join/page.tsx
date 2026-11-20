'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { AppShell } from '@/components/dashboard/AppShell'
import { normalizeJoinCode } from '@/lib/join-code.mjs'
import {
  getCompetitionById,
  joinCompetitionByCode,
  resolveJoinCodeToCompetitionId,
} from '@/lib/competitions'

function JoinByCodeContent() {
  const searchParams = useSearchParams()
  const raw = searchParams.get('code') ?? ''
  const code = normalizeJoinCode(decodeURIComponent(raw))
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const t = useTranslations('dashboard')
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    if (authLoading) return
    if (!code) {
      setStatus('error')
      setMessage(t('joinCodeInvalid'))
      return
    }

    async function run() {
      if (!user) {
        setStatus('error')
        setMessage(t('joinCodeSignIn'))
        return
      }

      try {
        const competitionId = await resolveJoinCodeToCompetitionId(code)
        if (!competitionId) {
          setStatus('error')
          setMessage(t('joinCodeError_invalid'))
          return
        }
        const comp = await getCompetitionById(competitionId)
        const result = await joinCompetitionByCode(user.uid, code)
        if (!result.ok) {
          setStatus('error')
          setMessage(t(`joinCodeError_${result.reason}` as 'joinCodeError_invalid'))
          return
        }
        setStatus('done')
        const gw = comp?.activeGameweekId
        if (gw) {
          router.replace(`/picks/?id=${gw}`)
        } else {
          router.replace('/dashboard/')
        }
      } catch {
        setStatus('error')
        setMessage(t('joinCodeError_invalid'))
      }
    }

    void run()
  }, [authLoading, code, router, t, user])

  return (
    <AppShell mainClassName="flex-1 flex items-center justify-center px-4">
      <div className="text-center text-ivory/80 text-sm max-w-sm">
        {status === 'loading' ? t('joinCodeWorking') : message || t('joinCodeWorking')}
      </div>
    </AppShell>
  )
}

export default function JoinByCodePage() {
  return (
    <Suspense
      fallback={
        <AppShell mainClassName="flex-1 flex items-center justify-center px-4">
          <p className="text-ivory/70 text-sm">Loading…</p>
        </AppShell>
      }
    >
      <JoinByCodeContent />
    </Suspense>
  )
}