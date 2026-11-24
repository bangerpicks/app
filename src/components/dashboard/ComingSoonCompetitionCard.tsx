'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useLanguage } from '@/lib/LanguageProvider'
import { Hourglass } from 'lucide-react'
import type { CompetitionDocument } from '@/types/competition'
import type { GameweekData } from '@/types/dashboard'
import {
  comingSoonCountdown,
  formatComingSoonCountdown,
  timestampToMs,
} from '@/lib/competition-catalog'
import { formatComingSoonOpensAt } from '@/lib/locale-format'
import { brandGameweekForCompetition } from '@/lib/competition-display'
import { inferLeagueBrandFromCompetition } from '@/lib/competition-league-brand'
import { resolveGameweekCardBranding } from '@/lib/gameweek-card-branding'
import { GameweekCardHeader } from './GameweekCardHeader'

interface ComingSoonCompetitionCardProps {
  competition: CompetitionDocument
}

function competitionKindToGameweekType(kind: CompetitionDocument['kind']): string {
  if (kind === 'league') return 'league'
  if (kind === 'cup') return 'cup'
  return 'banger-week'
}

/** Non-interactive teaser for a competition whose first round is not published yet. */
export function ComingSoonCompetitionCard({ competition }: ComingSoonCompetitionCardProps) {
  const t = useTranslations('dashboard')
  const { locale } = useLanguage()
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const headerLeagueBrand = inferLeagueBrandFromCompetition(competition)
  const opensAtMs = timestampToMs(competition.opensAt)
  const countdown = comingSoonCountdown(opensAtMs, nowMs)
  const opensAtLabel = opensAtMs > 0 ? formatComingSoonOpensAt(new Date(opensAtMs), locale) : ''

  const brandingCopy = useMemo(
    () => ({
      flagshipTitle: t('gameweekBrandFlagshipTitle'),
      flagshipSubtitle: t('gameweekBrandFlagshipSubtitle'),
      leagueSubtitle: t('gameweekBrandLeagueSubtitle'),
      cupSubtitle: t('gameweekBrandCupSubtitle'),
      edition: (week: number) => t('gameweekBrandEdition', { week }),
    }),
    [t]
  )

  const branding = useMemo(() => {
    const present = brandGameweekForCompetition(
      {
        gameweekId: competition.competitionId,
        name: competition.displayName,
        playerCount: 0,
        status: 'UPCOMING',
        type: competitionKindToGameweekType(competition.kind) as GameweekData['type'],
      },
      competition,
      locale
    )
    return resolveGameweekCardBranding(present, brandingCopy)
  }, [brandingCopy, competition, locale])

  return (
    <div className="w-full gameweek-card-slot" aria-label={`${branding.title} — ${t('comingSoonBadge')}`}>
      <GameweekCardHeader
        branding={branding}
        shellClassName="bg-amber-glow text-midnight-violet"
        leagueBrand={headerLeagueBrand}
        icon={branding.icon}
        markFallback={<Hourglass className="h-6 w-6 text-current" strokeWidth={2.25} />}
      />

      <div className="border-2 border-dashed border-amber-glow/50 border-t-0 rounded-b-[10px] px-4 py-5 flex flex-col items-center gap-3 bg-midnight-violet/50 backdrop-blur-sm gameweek-card-body-slot">
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