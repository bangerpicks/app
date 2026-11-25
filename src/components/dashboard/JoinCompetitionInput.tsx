'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { isValidJoinCodeFormat } from '@/lib/join-code.mjs'
import { joinCompetitionByCode } from '@/lib/competitions'

export function JoinCompetitionInput() {
  const t = useTranslations('dashboard')
  const { user } = useAuth()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidJoinCodeFormat(code)) {
      setError(t('joinCodeInvalid'))
      return
    }
    if (!user) {
      router.push(`/join/?code=${encodeURIComponent(code.trim())}`)
      return
    }
    setBusy(true)
    try {
      const result = await joinCompetitionByCode(user.uid, code)
      if (!result.ok) {
        setError(t(`joinCodeError_${result.reason}` as 'joinCodeError_invalid'))
        return
      }
      router.push(`/my-games/?joined=${result.competitionId}`)
    } catch {
      setError(t('joinCodeError_invalid'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-xl flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
    >
      <label className="sr-only" htmlFor="join-code-input">
        {t('joinCodeLabel')}
      </label>
      <input
        id="join-code-input"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t('joinCodePlaceholder')}
        className="flex-1 rounded-lg bg-midnight-violet/80 border border-ivory/20 px-3 py-2 text-sm text-ivory placeholder:text-ivory/40"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-lime-yellow text-midnight-violet font-bold text-sm px-4 py-2 disabled:opacity-60"
      >
        {t('joinCodeCta')}
      </button>
      {error ? (
        <p className="w-full text-xs text-red-300 sm:order-last">{error}</p>
      ) : null}
    </form>
  )
}