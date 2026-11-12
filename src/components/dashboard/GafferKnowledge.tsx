'use client'

import { useEffect, useState } from 'react'
import {
  readGafferDisplayPrefsFromStorage,
  useGafferDisplayPrefs,
} from '@/lib/gaffer-display-prefs'
import { useTranslations } from 'next-intl'
import {
  officialConfidenceTranslationKey,
  officialPickTranslationKey,
  type GafferWinProbabilities,
} from '@/lib/match-card-display'
import {
  formatDecimalOddsDisplay,
  hasDisplayableMarketOdds,
} from '@/lib/market-odds'
import type { MarketOddsSnapshot } from '@/types/dashboard'
import type { OfficialConfidence, Prediction } from '@/types/dashboard'
import { Info } from 'lucide-react'

interface GafferKnowledgeProps {
  whyText?: string
  officialPick?: Prediction
  officialConfidence?: OfficialConfidence
  marketOdds?: MarketOddsSnapshot
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
  officialPick,
  officialConfidence,
  marketOdds,
  crowdPickPercents,
  crowdPickCount = 0,
}: GafferKnowledgeProps) {
  const t = useTranslations('dashboard')

  const marketSnapshot = hasDisplayableMarketOdds(marketOdds)
    ? marketOdds
    : undefined
  const marketPercents = marketSnapshot?.impliedPercents
  const showMarketBar = Boolean(marketPercents)
  const showOfficialLean = Boolean(officialPick)

  const { prefs, ready } = useGafferDisplayPrefs()
  const [knowledgeHidden, setKnowledgeHidden] = useState(
    () => !readGafferDisplayPrefsFromStorage().knowledgeOpenOnLoad
  )
  const [marketHidden, setMarketHidden] = useState(
    () => !readGafferDisplayPrefsFromStorage().pickOpenOnLoad
  )
  const [defaultsApplied, setDefaultsApplied] = useState(false)

  useEffect(() => {
    if (!ready || defaultsApplied) return
    setKnowledgeHidden(!prefs.knowledgeOpenOnLoad)
    setMarketHidden(!prefs.pickOpenOnLoad)
    setDefaultsApplied(true)
  }, [ready, prefs, defaultsApplied])

  const hasKnowledge = Boolean(whyText)
  const knowledgeVisible = hasKnowledge && !knowledgeHidden
  const marketVisible = showMarketBar && !marketHidden
  const hasGafferContent =
    hasKnowledge || showOfficialLean || showMarketBar
  const showCrowd = Boolean(crowdPickPercents && crowdPickCount > 0)

  const ariaLabel = hasGafferContent
    ? t('gafferKnowledgeAria')
    : showCrowd
      ? t('crowdPicksAria')
      : undefined

  const leanPickLabel = officialPick
    ? t(officialPickTranslationKey(officialPick))
    : ''
  const leanConfidenceLabel = officialConfidence
    ? t(officialConfidenceTranslationKey(officialConfidence))
    : t(officialConfidenceTranslationKey('Lean'))

  return (
    <div
      className="rounded-lg border border-ivory/20 bg-[#321045] px-2.5 py-2"
      aria-label={ariaLabel}
    >
      {hasGafferContent ? (
        <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[14px]">
          <div className="flex items-center gap-1 min-w-0">
            <Info
              className="h-3 w-3 shrink-0 text-ivory/45"
              strokeWidth={2}
              aria-hidden
            />
            <p className="text-[9px] font-semibold uppercase tracking-wider text-ivory/55 leading-none truncate">
              {t('gafferKnowledgeTitle')}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasKnowledge ? (
              knowledgeVisible ? (
                <button
                  type="button"
                  className={hideBtnClass}
                  onClick={() => setKnowledgeHidden(true)}
                >
                  {t('gafferHideKnowledge')}
                </button>
              ) : (
                <button
                  type="button"
                  className={showBtnClass}
                  onClick={() => setKnowledgeHidden(false)}
                >
                  {t('gafferShowKnowledge')}
                </button>
              )
            ) : null}
            {showMarketBar ? (
              marketVisible ? (
                <button
                  type="button"
                  className={hideBtnClass}
                  onClick={() => setMarketHidden(true)}
                >
                  {t('marketOddsHide')}
                </button>
              ) : (
                <button
                  type="button"
                  className={showBtnClass}
                  onClick={() => setMarketHidden(false)}
                >
                  {t('marketOddsShow')}
                </button>
              )
            ) : null}
          </div>
        </div>
      ) : null}

      {knowledgeVisible ? (
        <p className="text-xs text-ivory leading-snug mb-2">{whyText}</p>
      ) : null}

      {showOfficialLean ? (
        <p
          className={`text-[10px] sm:text-xs text-ivory/90 leading-snug ${
            knowledgeVisible ? 'mt-0' : ''
          } ${showMarketBar && marketVisible ? 'mb-2' : showCrowd ? 'mb-2' : ''}`}
        >
          {t('gafferLeanLine', {
            pick: leanPickLabel,
            confidence: leanConfidenceLabel,
          })}
        </p>
      ) : null}

      {marketVisible && marketSnapshot && marketPercents ? (
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

      {crowdPickPercents && crowdPickCount > 0 ? (
        <div
          className={
            marketVisible && marketPercents
              ? 'mt-2.5 pt-2.5 border-t border-ivory/10'
              : showOfficialLean || knowledgeVisible
                ? 'mt-2.5 pt-2.5 border-t border-ivory/10'
                : ''
          }
        >
          <PickDistributionSection
            title={t('crowdPicksTitle')}
            titleClassName="text-ivory/70"
            probs={crowdPickPercents}
            subtitle={t('crowdPicksSubtitle', { count: crowdPickCount })}
          />
        </div>
      ) : null}
    </div>
  )
}
