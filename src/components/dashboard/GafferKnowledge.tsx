'use client'

import { useEffect, useState } from 'react'
import {
  readGafferDisplayPrefsFromStorage,
  useGafferDisplayPrefs,
} from '@/lib/gaffer-display-prefs'
import { useTranslations } from 'next-intl'
import type { GafferWinProbabilities } from '@/lib/match-card-display'
import {
  formatDecimalOddsDisplay,
  hasDisplayableMarketOdds,
} from '@/lib/market-odds'
import { crowdStatsToPercents, type CrowdPickStats } from '@/lib/crowd-picks'
import type { MarketOddsSnapshot } from '@/types/dashboard'

interface GafferKnowledgeProps {
  whyText?: string
  marketOdds?: MarketOddsSnapshot
  crowdPickStats?: CrowdPickStats
  crowdPickPercents?: GafferWinProbabilities
  crowdPickCount?: number
}

function WinProbabilityBar({ probs }: { probs: GafferWinProbabilities }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-midnight-violet/80 ring-1 ring-ivory/10">
      <div className="h-full bg-lime-yellow" style={{ width: `${probs.home}%` }} />
      <div className="h-full bg-gray-500" style={{ width: `${probs.draw}%` }} />
      <div className="h-full bg-amber-glow" style={{ width: `${probs.away}%` }} />
    </div>
  )
}

function PickDistributionSection({
  title,
  titleClassName,
  probs,
  subtitle,
  decimalOdds,
}: {
  title: string
  titleClassName: string
  probs: GafferWinProbabilities
  subtitle?: string
  decimalOdds?: MarketOddsSnapshot['decimalOdds']
}) {
  const t = useTranslations('dashboard')

  const homeLabel = decimalOdds
    ? `${t('home')} ${formatDecimalOddsDisplay(decimalOdds.home)}`
    : t('home')
  const drawLabel = decimalOdds
    ? `${t('draw')} ${formatDecimalOddsDisplay(decimalOdds.draw)}`
    : t('draw')
  const awayLabel = decimalOdds
    ? `${t('away')} ${formatDecimalOddsDisplay(decimalOdds.away)}`
    : t('away')

  return (
    <div className="flex flex-col gap-1.5">
      <p
        className={`text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-center ${titleClassName}`}
      >
        {title}
      </p>
      {subtitle ? (
        <p className="text-[8px] text-ivory/45 text-center -mt-0.5">{subtitle}</p>
      ) : null}
      <div className="grid grid-cols-3 items-center gap-1 text-[9px] sm:text-[10px] font-semibold uppercase">
        <span className="text-lime-yellow text-left">
          {homeLabel} ({probs.home}%)
        </span>
        <span className="text-gray-400 text-center">
          {drawLabel} ({probs.draw}%)
        </span>
        <span className="text-amber-glow text-right">
          {awayLabel} ({probs.away}%)
        </span>
      </div>
      <WinProbabilityBar probs={probs} />
    </div>
  )
}

const hideBtnClass =
  'text-[9px] font-semibold uppercase tracking-wide text-ivory/55 hover:text-ivory transition-colors shrink-0'

const showBtnClass =
  'text-[9px] font-semibold uppercase tracking-wide text-lime-yellow/80 hover:text-lime-yellow transition-colors shrink-0'

export function GafferKnowledge({
  whyText,
  marketOdds,
  crowdPickStats,
  crowdPickPercents,
  crowdPickCount = 0,
}: GafferKnowledgeProps) {
  const t = useTranslations('dashboard')

  const marketSnapshot = hasDisplayableMarketOdds(marketOdds)
    ? marketOdds
    : undefined
  const marketPercents = marketSnapshot?.impliedPercents
  const showMarketBar = Boolean(marketPercents)
  const showCrowd = Boolean(crowdPickStats && crowdPickCount > 0)
  const showOddsDisclosure = showMarketBar || showCrowd

  const { prefs, ready } = useGafferDisplayPrefs()
  const [contextHidden, setContextHidden] = useState(
    () => !readGafferDisplayPrefsFromStorage().knowledgeOpenOnLoad
  )
  const [oddsDisclosureHidden, setOddsDisclosureHidden] = useState(
    () => !readGafferDisplayPrefsFromStorage().pickOpenOnLoad
  )
  const [defaultsApplied, setDefaultsApplied] = useState(false)

  useEffect(() => {
    if (!ready || defaultsApplied) return
    setContextHidden(!prefs.knowledgeOpenOnLoad)
    setOddsDisclosureHidden(!prefs.pickOpenOnLoad)
    setDefaultsApplied(true)
  }, [ready, prefs, defaultsApplied])

  const hasContext = Boolean(whyText)
  const contextVisible = hasContext && !contextHidden
  const oddsDisclosureOpen = showOddsDisclosure && !oddsDisclosureHidden

  if (!hasContext && !showOddsDisclosure) {
    return null
  }

  const ariaLabel = hasContext
    ? t('matchContextAria')
    : showOddsDisclosure
      ? t('oddsAndCrowdPicksAria')
      : undefined

  return (
    <div
      className="rounded-lg border border-ivory/20 bg-[#321045] px-2.5 py-2"
      aria-label={ariaLabel}
    >
      {hasContext ? (
        <>
          <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[14px]">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-ivory/55 leading-none truncate">
              {t('matchContextTitle')}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {contextVisible ? (
                <button
                  type="button"
                  className={hideBtnClass}
                  onClick={() => setContextHidden(true)}
                >
                  {t('matchContextHide')}
                </button>
              ) : (
                <button
                  type="button"
                  className={showBtnClass}
                  onClick={() => setContextHidden(false)}
                >
                  {t('matchContextShow')}
                </button>
              )}
            </div>
          </div>
          {contextVisible ? (
            <p className="text-xs text-ivory leading-snug line-clamp-2 mb-2">
              {whyText}
            </p>
          ) : null}
        </>
      ) : null}

      {showOddsDisclosure ? (
        <div
          className={
            hasContext && contextVisible
              ? 'mt-2 pt-2 border-t border-ivory/10'
              : hasContext
                ? 'mt-1'
                : ''
          }
        >
          <div className="flex items-center justify-end gap-2 mb-1.5 min-h-[14px]">
            {oddsDisclosureOpen ? (
              <button
                type="button"
                className={hideBtnClass}
                onClick={() => setOddsDisclosureHidden(true)}
              >
                {t('marketOddsHide')}
              </button>
            ) : (
              <button
                type="button"
                className={showBtnClass}
                onClick={() => setOddsDisclosureHidden(false)}
              >
                {t('marketOddsShow')}
              </button>
            )}
          </div>

          {oddsDisclosureOpen ? (
            <div className="flex flex-col gap-2.5">
              {showMarketBar && marketSnapshot && marketPercents ? (
                <PickDistributionSection
                  title={t('marketOddsTitle')}
                  titleClassName="text-ivory/80"
                  probs={marketPercents}
                  subtitle={t('marketOddsBookmaker', {
                    bookmaker: marketSnapshot.bookmakerName,
                  })}
                  decimalOdds={marketSnapshot.decimalOdds}
                />
              ) : null}

              {showCrowd && crowdPickStats ? (
                <CrowdPickSection
                  showMarketBar={showMarketBar}
                  crowdPickStats={crowdPickStats}
                  crowdPickPercents={crowdPickPercents}
                  crowdPickCount={crowdPickCount}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function CrowdPickSection({
  showMarketBar,
  crowdPickStats,
  crowdPickPercents,
  crowdPickCount,
}: {
  showMarketBar: boolean
  crowdPickStats: CrowdPickStats
  crowdPickPercents?: GafferWinProbabilities
  crowdPickCount: number
}) {
  const t = useTranslations('dashboard')
  const barPercents =
    crowdPickPercents ?? crowdStatsToPercents(crowdPickStats) ?? {
      home: 0,
      draw: 0,
      away: 0,
    }

  return (
    <div className={showMarketBar ? 'pt-2.5 border-t border-ivory/10' : ''}>
      <div className="flex flex-col gap-1.5">
        <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-center text-ivory/70">
          {t('crowdPicksTitle')}
        </p>
        <p className="text-[8px] text-ivory/45 text-center -mt-0.5">
          {t('crowdPicksSubtitle', { count: crowdPickCount })}
        </p>
        <div className="grid grid-cols-3 items-center gap-1 text-[9px] sm:text-[10px] font-semibold uppercase">
          <span className="text-lime-yellow text-left">
            {t('home')} {crowdPickStats.home}
          </span>
          <span className="text-gray-400 text-center">
            {t('draw')} {crowdPickStats.draw}
          </span>
          <span className="text-amber-glow text-right">
            {t('away')} {crowdPickStats.away}
          </span>
        </div>
        <WinProbabilityBar probs={barPercents} />
      </div>
    </div>
  )
}
