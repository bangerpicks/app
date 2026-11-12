'use client'

import { useEffect, useState } from 'react'
import {
  readGafferDisplayPrefsFromStorage,
  useGafferDisplayPrefs,
} from '@/lib/gaffer-display-prefs'
import { useTranslations } from 'next-intl'
import {
  deriveGafferWinProbabilities,
  type GafferWinProbabilities,
} from '@/lib/match-card-display'
import type { OfficialConfidence, Prediction } from '@/types/dashboard'
import { Info } from 'lucide-react'

interface GafferKnowledgeProps {
  whyText?: string
  officialPick?: Prediction
  officialConfidence?: OfficialConfidence
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

const hideBtnClass =
  'text-[9px] font-semibold uppercase tracking-wide text-ivory/55 hover:text-ivory transition-colors shrink-0'

const showBtnClass =
  'text-[9px] font-semibold uppercase tracking-wide text-lime-yellow/80 hover:text-lime-yellow transition-colors shrink-0'

export function GafferKnowledge({
  whyText,
  officialPick,
  officialConfidence,
}: GafferKnowledgeProps) {
  const t = useTranslations('dashboard')
  const probs = deriveGafferWinProbabilities(officialPick, officialConfidence)
  const showProb = Boolean(probs && officialPick)

  const { prefs, ready } = useGafferDisplayPrefs()
  const [knowledgeHidden, setKnowledgeHidden] = useState(
    () => !readGafferDisplayPrefsFromStorage().knowledgeOpenOnLoad
  )
  const [pickHidden, setPickHidden] = useState(
    () => !readGafferDisplayPrefsFromStorage().pickOpenOnLoad
  )
  const [defaultsApplied, setDefaultsApplied] = useState(false)

  useEffect(() => {
    if (!ready || defaultsApplied) return
    setKnowledgeHidden(!prefs.knowledgeOpenOnLoad)
    setPickHidden(!prefs.pickOpenOnLoad)
    setDefaultsApplied(true)
  }, [ready, prefs, defaultsApplied])

  const hasKnowledge = Boolean(whyText)
  const knowledgeVisible = hasKnowledge && !knowledgeHidden
  const pickVisible = showProb && !pickHidden

  return (
    <div
      className="rounded-lg border border-ivory/20 bg-midnight-violet/40 px-2.5 py-2"
      aria-label={t('gafferKnowledgeAria')}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[14px]">
        <div className="flex items-center gap-1 min-w-0">
          <Info className="h-3.5 w-3.5 shrink-0 text-lime-yellow" strokeWidth={2.5} aria-hidden />
          <p className="text-[10px] font-bold uppercase tracking-wide text-lime-yellow leading-none truncate">
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
          {showProb ? (
            pickVisible ? (
              <button
                type="button"
                className={hideBtnClass}
                onClick={() => setPickHidden(true)}
              >
                {t('gafferHidePick')}
              </button>
            ) : (
              <button
                type="button"
                className={showBtnClass}
                onClick={() => setPickHidden(false)}
              >
                {t('gafferShowPick')}
              </button>
            )
          ) : null}
        </div>
      </div>

      {knowledgeVisible ? (
        <p className="text-xs text-ivory leading-snug mb-2">{whyText}</p>
      ) : null}

      {pickVisible && probs && officialPick ? (
        <div className={`flex flex-col gap-1.5 ${knowledgeVisible ? '' : 'mt-0'}`}>
          <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-lime-yellow text-center">
            {t('gafferWinProbability')}
          </p>
          <div className="grid grid-cols-3 items-center gap-1 text-[9px] sm:text-[10px] font-semibold uppercase">
            <span className="text-lime-yellow text-left">
              {t('home')} ({probs.home}%)
            </span>
            <span className="text-gray-400 text-center">
              {t('draw')} ({probs.draw}%)
            </span>
            <span className="text-amber-glow text-right">
              {t('away')} ({probs.away}%)
            </span>
          </div>
          <WinProbabilityBar probs={probs} />
        </div>
      ) : null}
    </div>
  )
}
