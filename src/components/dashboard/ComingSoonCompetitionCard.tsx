'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Hourglass } from 'lucide-react'
import type { CompetitionDocument } from '@/types/competition'
import type { Locale } from '@/i18n/config'
import {
  comingSoonCountdown,
  formatComingSoonCountdown,
  timestampToMs,
} from '@/lib/competition-catalog'
import { formatComingSoonOpensAt } from '@/lib/locale-format'

interface ComingSoonCompetitionCardProps {
  competition: CompetitionDocument
}

/** Non-interactive teaser for a competition whose first round is not published yet. */
export function ComingSoonCompetitionCard({ competition }: ComingSoonCompetitionCardProps) {
  const t = useTranslations('dashboard')
  const locale = useLocale() as Locale
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const isEs = locale === 'es-MX'
  const title = isEs && competition.displayName_esMX ? competition.displayName_esMX : competition.displayName
  const tagline = isEs && competition.tagline_esMX ? competition.tagline_esMX : competition.tagline
  const opensAtMs = timestampToMs(competition.opensAt)
  const countdown = comingSoonCountdown(opensAtMs, nowMs)
  const opensAtLabel = opensAtMs > 0 ? formatComingSoonOpensAt(new Date(opensAtMs), locale) : ''

  return (
    <div className="w-full gameweek-card-slot" aria-label={`${title} — ${t('comingSoonBadge')}`}>
      <div className="bg-lime-yellow/85 rounded-t-[10px] px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3 shadow-sm">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-midnight-violet/15 bg-midnight-violet/10"
          aria-hidden
        >
          <Hourglass className="h-6 w-6 text-midnight-violet" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <h2 className="text-base sm:text-lg font-black leading-tight text-midnight-violet">{title}</h2>
          {tagline ? (
            <p className="mt-0.5 text-xs sm:text-sm font-medium leading-snug text-midnight-violet/80 line-clamp-2">
              {tagline}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-2 border-dashed border-ivory/25 border-t-0 rounded-b-[10px] px-4 py-5 flex flex-col items-center gap-3 bg-midnight-violet/50 backdrop-blur-sm gameweek-card-body-slot">
        <span className="rounded-full border border-amber-glow/60 bg-amber-glow/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-glow">
          {t('comingSoonBadge')}
        </span>
        <p className="text-xl sm:text-2xl font-black text-ivory tabular-nums text-center" aria-live="polite">
          {countdown
            ? t('comingSoonOpensIn', { countdown: formatComingSoonCountdown(countdown) })
            : t('comingSoonOpeningSoon')}
        </p>
        {opensAtLabel ? (
          <p className="text-center text-xs text-ivory/60">{t('comingSoonOpensAt', { date: opensAtLabel })}</p>
        ) : null}
      </div>
    </div>
  )
}