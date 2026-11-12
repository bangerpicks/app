'use client'

import { useTranslations } from 'next-intl'
import { useLanguage } from '@/lib/LanguageProvider'
import {
  formatLeagueRankLabel,
  shouldShowLeaguePositionRow,
} from '@/lib/match-card-display'

interface MatchStatsProps {
  score?: { home: number; away: number } | null
  homePosition?: number
  awayPosition?: number
  isLive?: boolean
}

export function MatchStats({
  score,
  homePosition,
  awayPosition,
  isLive = false,
}: MatchStatsProps) {
  const t = useTranslations('dashboard')
  const { locale } = useLanguage()

  const homeLabel = formatLeagueRankLabel(homePosition, locale)
  const awayLabel = formatLeagueRankLabel(awayPosition, locale)
  const showLeagueRow = shouldShowLeaguePositionRow(homePosition, awayPosition)

  return (
    <div className="flex flex-col items-center justify-center gap-4 flex-1">
      <div className="flex items-center gap-3">
        {score ? (
          <>
            <span
              className={`text-3xl sm:text-4xl font-bold tracking-[0.24px] text-white ${isLive ? 'animate-pulse' : ''}`}
            >
              {score.home}
            </span>
            <span className="text-xl sm:text-2xl font-medium tracking-[0.14px] text-white opacity-70">
              -
            </span>
            <span
              className={`text-3xl sm:text-4xl font-bold tracking-[0.24px] text-white ${isLive ? 'animate-pulse' : ''}`}
            >
              {score.away}
            </span>
          </>
        ) : (
          <>
            <span className="text-3xl sm:text-4xl font-bold tracking-[0.24px] text-white">-</span>
            <span className="text-xl sm:text-2xl font-medium tracking-[0.14px] text-white opacity-70">
              -
            </span>
            <span className="text-3xl sm:text-4xl font-bold tracking-[0.24px] text-white">-</span>
          </>
        )}
      </div>

      {showLeagueRow ? (
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider text-center">
            {t('leaguePosition')}
          </span>
          <div className="flex items-baseline gap-4">
            <span className="text-base font-semibold text-white">
              {homeLabel ?? '—'}
            </span>
            <span className="text-sm text-white/50">|</span>
            <span className="text-base font-semibold text-white">
              {awayLabel ?? '—'}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
