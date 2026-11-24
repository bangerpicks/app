'use client'

import { useTranslations } from 'next-intl'
import { pickPluralKey } from '@/lib/i18n-plural.mjs'
import type { GameweekDisplayPhase } from '@/lib/gameweek-display-phase'

interface GameweekCardPersonalStripProps {
  phase: GameweekDisplayPhase
  playerCount: number
  picksSaved: number
  totalFixtures: number
  rank: number | null
  points: number | null
  correct: number | null
  hasAnyPicks: boolean
  loading?: boolean
}

export function GameweekCardPersonalStrip({
  phase,
  playerCount,
  picksSaved,
  totalFixtures,
  rank,
  points,
  correct,
  hasAnyPicks,
  loading,
}: GameweekCardPersonalStripProps) {
  const t = useTranslations('dashboard')

  if (loading) {
    return (
      <p className="text-center text-xs text-ivory/50 animate-pulse" aria-busy="true">
        {t('gameweekPersonalLoading')}
      </p>
    )
  }

  const isPickPhase = phase === 'OPEN' || phase === 'CLOSING_SOON'
  const showScoring =
    hasAnyPicks &&
    (phase === 'PICKS_LOCKED' ||
      phase === 'LIVE' ||
      phase === 'FINAL' ||
      phase === 'COMPLETED')

  if (!hasAnyPicks && !isPickPhase) {
    return null
  }

  if (isPickPhase && totalFixtures > 0) {
    return (
      <p className="text-center text-xs sm:text-sm font-semibold text-ivory/85 tabular-nums">
        {hasAnyPicks
          ? t('gameweekPicksProgress', { saved: picksSaved, total: totalFixtures })
          : t('gameweekPicksProgressEmpty', { total: totalFixtures })}
      </p>
    )
  }

  if (!showScoring) {
    return null
  }

  const parts: string[] = []

  if (rank != null && playerCount > 0) {
    parts.push(t('gameweekYourRank', { rank, count: playerCount }))
  } else if (rank != null) {
    parts.push(t('gameweekYourRankShort', { rank }))
  }

  if (points != null) {
    parts.push(t('gameweekYourPoints', { points }))
  }

  if (correct != null && totalFixtures > 0) {
    parts.push(
      t(
        pickPluralKey(correct, 'gameweekCorrectOne', 'gameweekCorrectMany'),
        { correct, total: totalFixtures }
      )
    )
  }

  if (parts.length === 0) return null

  return (
    <p className="text-center text-xs sm:text-sm font-semibold text-ivory/90 leading-snug">
      <span className="text-lime-yellow/90">{t('gameweekYourWeek')}</span>
      {' '}
      {parts.join(' · ')}
    </p>
  )
}