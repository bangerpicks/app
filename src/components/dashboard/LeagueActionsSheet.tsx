'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Loader2, X } from 'lucide-react'
import { leaveLeague } from '@/lib/league-membership'
import type { LeaveLeagueResponse } from '@/lib/league-membership'

interface LeagueActionsSheetProps {
  isOpen: boolean
  onClose: () => void
  competitionId: string
  competitionName: string
  gameweekId: string
  onLeaveComplete?: (result: LeaveLeagueResponse) => void
  picksHref: string
}

export function LeagueActionsSheet({
  isOpen,
  onClose,
  competitionId,
  competitionName,
  gameweekId,
  onLeaveComplete,
  picksHref,
}: LeagueActionsSheetProps) {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const [mounted, setMounted] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setConfirming(false)
      setError(null)
    }
  }, [isOpen])

  async function handleLeave() {
    setBusy(true)
    setError(null)
    try {
      const result = await leaveLeague(competitionId)
      onLeaveComplete?.(result)
      onClose()
    } catch {
      setError(t('leaveLeagueError'))
    } finally {
      setBusy(false)
    }
  }

  if (!mounted || !isOpen) return null

  const leaderboardHref = `/rankings/?competition=${encodeURIComponent(competitionId)}`

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label={tCommon('cancel')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="league-actions-title"
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-ivory/15 bg-midnight-violet p-5 pb-8 sm:pb-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ivory/50">
              {competitionName}
            </p>
            <h2 id="league-actions-title" className="text-lg font-black text-ivory">
              {competitionName}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-ivory/70 hover:bg-ivory/10"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Link
            href={picksHref}
            className="rounded-lg border border-ivory/20 px-4 py-3 text-sm font-semibold text-ivory text-center"
            onClick={onClose}
          >
            {t('leagueActionPicks')}
          </Link>
          <Link
            href={leaderboardHref}
            className="rounded-lg border border-ivory/20 px-4 py-3 text-sm font-semibold text-ivory text-center"
            onClick={onClose}
          >
            {t('leagueActionLeaderboard')}
          </Link>

          {!confirming ? (
            <button
              type="button"
              className="rounded-lg border border-cinnabar/40 bg-cinnabar/10 px-4 py-3 text-sm font-semibold text-cinnabar"
              onClick={() => setConfirming(true)}
            >
              {t('leaveLeague')}
            </button>
          ) : (
            <div className="rounded-lg border border-cinnabar/30 bg-cinnabar/5 p-4 flex flex-col gap-3">
              <p className="text-sm font-bold text-ivory">{t('leaveLeagueConfirmTitle')}</p>
              <p className="text-xs text-ivory/75">{t('leaveLeagueConfirmBodyOpen')}</p>
              {error ? <p className="text-xs text-cinnabar">{error}</p> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-ivory/20 py-2 text-sm text-ivory"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-cinnabar py-2 text-sm font-semibold text-midnight-violet flex items-center justify-center gap-2"
                  disabled={busy}
                  onClick={() => void handleLeave()}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t('leaveLeague')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}