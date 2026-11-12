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
import { FlatCapIcon } from '@/components/icons/FlatCapIcon'

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
      <div className="flex items-baseline justify-between gap-2">
        <p
          className={`text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide shrink-0 ${titleClassName}`}
        >
          {title}
        </p>
        {subtitle ? (
          <p className="text-[8px] text-ivory/45 text-right min-w-0 truncate">
            {subtitle}
          </p>
        ) : null}
      </div>
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

function shouldShowMatchContentOnLoad(
  hasContext: boolean,
  showOddsDisclosure: boolean,
  knowledgeOpenOnLoad: boolean,
  pickOpenOnLoad: boolean
): boolean {
  if (hasContext && knowledgeOpenOnLoad) return true
  if (showOddsDisclosure && pickOpenOnLoad) return true
  return false
}

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

  const hasContext = Boolean(whyText)

  const { prefs, ready } = useGafferDisplayPrefs()
  const [contentHidden, setContentHidden] = useState(() => {
    const stored = readGafferDisplayPrefsFromStorage()
    return !shouldShowMatchContentOnLoad(
      Boolean(whyText),
      showOddsDisclosure,
      stored.knowledgeOpenOnLoad,
      stored.pickOpenOnLoad
    )
  })
  const [defaultsApplied, setDefaultsApplied] = useState(false)

  useEffect(() => {
    if (!ready || defaultsApplied) return
    setContentHidden(
      !shouldShowMatchContentOnLoad(
        hasContext,
        showOddsDisclosure,
        prefs.knowledgeOpenOnLoad,
        prefs.pickOpenOnLoad
      )
    )
    setDefaultsApplied(true)
  }, [ready, prefs, defaultsApplied, hasContext, showOddsDisclosure])

  const contentOpen = !contentHidden

  if (!hasContext && !showOddsDisclosure) {
    return null
  }

  const ariaLabel =
    hasContext && showOddsDisclosure
      ? t('matchContentAria')
      : hasContext
        ? t('matchContextAria')
        : showOddsDisclosure
          ? t('oddsAndCrowdPicksAria')
          : undefined

  return (
    <div
      className="rounded-lg border border-ivory/20 bg-[#321045] px-2.5 py-2"
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[14px]">
        <div className="flex items-center gap-1.5 shrink-0 text-ivory/80">
          <FlatCapIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide">
            {t('gafferLabel')}
          </p>
        </div>
        {contentOpen ? (
          <button
            type="button"
            className={hideBtnClass}
            onClick={() => setContentHidden(true)}
          >
            {t('matchContentHide')}
          </button>
        ) : (
          <button
            type="button"
            className={showBtnClass}
            onClick={() => setContentHidden(false)}
          >
            {t('matchContentShow')}
          </button>
        )}
      </div>

      {contentOpen ? (
        <>
          {hasContext ? (
            <p className="text-xs text-ivory/85 leading-snug line-clamp-4 mb-2">
              {whyText}
            </p>
          ) : null}

          {showOddsDisclosure ? (
            <div
              className={
                hasContext ? 'mt-2 pt-2 border-t border-ivory/10' : ''
              }
            >
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
            </div>
          ) : null}
        </>
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
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide shrink-0 text-ivory/70">
            {t('crowdPicksTitle')}
          </p>
          <p className="text-[8px] text-ivory/45 text-right min-w-0 truncate">
            {t('crowdPicksSubtitle', { count: crowdPickCount })}
          </p>
        </div>
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
