'use client'

import { useTranslations } from 'next-intl'
import { MapPin } from 'lucide-react'
import { MatchCardData, Prediction } from '@/types/dashboard'
import { TeamInfo } from './TeamInfo'
import { MatchStats } from './MatchStats'
import { PredictionButtons } from './PredictionButtons'
import { GafferKnowledge } from './GafferKnowledge'
import { useLanguage } from '@/lib/LanguageProvider'
import {
  formatMatchVenue,
  resolveWhyItMatters,
  type GafferWinProbabilities,
} from '@/lib/match-card-display'
import type { CrowdPickStats } from '@/lib/crowd-picks'
import { hasDisplayableMarketOdds } from '@/lib/market-odds'
import {
  formatMatchCardHeaderDate,
  formatMatchKickoffTime,
} from '@/lib/locale-format'

interface MatchCardProps {
  match: MatchCardData
  userPrediction?: Prediction | null
  onPredictionSelect: (fixtureId: number, prediction: Prediction) => void
  disabled?: boolean
  /** When true, show prediction and result only (no buttons) */
  readOnly?: boolean
  crowdPickStats?: CrowdPickStats
  crowdPickPercents?: GafferWinProbabilities
  crowdPickCount?: number
}

export function MatchCard({
  match,
  userPrediction,
  onPredictionSelect,
  disabled = false,
  readOnly = false,
  crowdPickStats,
  crowdPickPercents,
  crowdPickCount = 0,
}: MatchCardProps) {
  const t = useTranslations('dashboard')
  const { locale } = useLanguage()

  const whyText = resolveWhyItMatters(
    match.whyItMatters,
    match.whyItMatters_esMX,
    locale
  )

  const venueLabel = formatMatchVenue(match.venue)
  const showFixtureInsights =
    Boolean(whyText) ||
    hasDisplayableMarketOdds(match.marketOdds) ||
    (crowdPickStats != null && crowdPickCount > 0)

  const handlePredictionSelect = (prediction: Prediction) => {
    if (!readOnly) onPredictionSelect(match.fixtureId, prediction)
  }

  const centerStatusLabel =
    match.matchStatus === 'LIVE'
      ? t('matchStatusLive')
      : formatMatchCardHeaderDate(match.date, locale)

  return (
    <div className="w-full">
      {/* Match Info Header */}
      <div className="bg-ivory rounded-t-[10px] px-2 sm:px-2.5 py-1.5 flex flex-col gap-1 min-h-[35px]">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] items-start gap-1 sm:gap-2">
          <div className="text-[10px] sm:text-xs font-medium text-midnight-violet text-left truncate min-w-0">
            {match.league.name}
          </div>
          <div className="text-[10px] sm:text-xs font-medium text-midnight-violet text-center truncate min-w-0 px-0.5">
            {centerStatusLabel}
          </div>
          <div className="text-[10px] sm:text-xs font-medium text-midnight-violet text-right truncate min-w-0 flex items-center justify-end gap-1.5">
          {match.matchStatus === 'HT' ? (
            <>
              <span>{t('matchStatusHt')}</span>
              <span
                className="w-1.5 h-1.5 rounded-full bg-cinnabar animate-pulse"
                style={{
                  boxShadow: '0 0 6px #ee4136',
                }}
              />
            </>
          ) : match.matchStatus === 'LIVE' ? (
            <>
              <span>
                {match.minute}
                {match.stoppageTime ? `+${match.stoppageTime}` : ''}
                &apos;
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full bg-cinnabar animate-pulse"
                style={{
                  boxShadow: '0 0 6px #ee4136',
                }}
              />
            </>
          ) : match.matchStatus === 'FT' ? (
            <span>{t('matchStatusFt')}</span>
          ) : (
            <span>{formatMatchKickoffTime(match.date, locale)}</span>
          )}
          </div>
        </div>
        {venueLabel ? (
          <div className="flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-normal text-midnight-violet/90 w-full min-w-0 px-1">
            <MapPin
              className="w-2.5 h-2.5 shrink-0 text-midnight-violet"
              strokeWidth={2.5}
              aria-hidden
            />
            <span className="text-center leading-tight line-clamp-2">{venueLabel}</span>
          </div>
        ) : null}
      </div>

      <div className="border border-ivory rounded-b-[10px] px-2.5 py-2.5 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          {/* Home Team */}
          <TeamInfo team={match.homeTeam} />

          {/* Match Stats */}
          <MatchStats
            score={match.score}
            homePosition={match.homeTeam.position}
            awayPosition={match.awayTeam.position}
            isLive={match.matchStatus === 'LIVE' || match.matchStatus === 'HT'}
          />

          {/* Away Team */}
          <TeamInfo team={match.awayTeam} />
        </div>

        {showFixtureInsights ? (
          <GafferKnowledge
            whyText={whyText}
            marketOdds={match.marketOdds}
            crowdPickStats={crowdPickStats}
            crowdPickPercents={crowdPickPercents}
            crowdPickCount={crowdPickCount}
          />
        ) : null}

        {/* Prediction Buttons or read-only prediction */}
        {readOnly ? (
          <div className="flex items-center justify-center gap-2 py-1">
            {userPrediction ? (
              <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded font-bold text-sm bg-ivory/20 text-ivory prediction-result-slot">
                {userPrediction}
              </span>
            ) : (
              <span className="text-ivory/50 text-sm">—</span>
            )}
          </div>
        ) : (
          <PredictionButtons
            homeTeamName={match.homeTeam.name}
            awayTeamName={match.awayTeam.name}
            selected={userPrediction}
            onSelect={handlePredictionSelect}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  )
}
