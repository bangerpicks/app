'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Target, Clock, Trophy, X, HelpCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const STORAGE_KEY = 'banger-picks:gameweek-how-it-works-dismissed'

const STEPS: { key: 'gameweekHowItWorksStep1' | 'gameweekHowItWorksStep2' | 'gameweekHowItWorksStep3'; Icon: LucideIcon }[] = [
  { key: 'gameweekHowItWorksStep1', Icon: Target },
  { key: 'gameweekHowItWorksStep2', Icon: Clock },
  { key: 'gameweekHowItWorksStep3', Icon: Trophy },
]

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeDismissed(dismissed: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (dismissed) {
      localStorage.setItem(STORAGE_KEY, '1')
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore quota / private mode failures
  }
}

export function GameweekHowItWorks() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const [dismissed, setDismissed] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setDismissed(readDismissed())
    setReady(true)
  }, [])

  const handleDismiss = () => {
    writeDismissed(true)
    setDismissed(true)
  }

  const handleOpen = () => {
    writeDismissed(false)
    setDismissed(false)
  }

  if (!ready) {
    return null
  }

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-ivory/20 bg-[#321045] px-3 py-2.5 text-sm font-semibold text-lime-yellow hover:border-lime-yellow/50 hover:bg-[#3a1450] transition-colors min-h-[44px]"
        aria-label={t('gameweekHowItWorksOpen')}
      >
        <HelpCircle className="w-4 h-4" aria-hidden />
        {t('gameweekHowItWorksTitle')}
      </button>
    )
  }

  return (
    <section
      className="relative rounded-lg border border-ivory/20 bg-[#321045] px-3 py-3 flex flex-col gap-3"
      aria-label={t('gameweekHowItWorksTitle')}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-1.5 top-1.5 text-ivory/60 hover:text-lime-yellow min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
        aria-label={tCommon('close')}
      >
        <X size={18} />
      </button>
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-lime-yellow text-center pr-8">
        {t('gameweekHowItWorksTitle')}
      </h3>
      <ol className="flex flex-col gap-3">
        {STEPS.map(({ key, Icon }) => (
          <li key={key} className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full bg-lime-yellow/20 flex items-center justify-center"
              aria-hidden
            >
              <Icon className="w-5 h-5 text-lime-yellow" />
            </div>
            <p className="flex-1 min-w-0 text-sm text-ivory/80 leading-snug pt-2">
              {t(key)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
