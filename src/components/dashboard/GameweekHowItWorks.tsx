'use client'

import { useTranslations } from 'next-intl'

const STEPS = ['gameweekHowItWorksStep1', 'gameweekHowItWorksStep2', 'gameweekHowItWorksStep3'] as const

export function GameweekHowItWorks() {
  const t = useTranslations('dashboard')

  return (
    <section
      className="rounded-lg border border-ivory/20 bg-[#321045] px-2.5 py-2.5 flex flex-col gap-2"
      aria-label={t('gameweekHowItWorksTitle')}
    >
      <h3 className="text-[10px] font-bold uppercase tracking-wide text-lime-yellow text-center">
        {t('gameweekHowItWorksTitle')}
      </h3>
      <ol className="flex flex-col gap-1.5">
        {STEPS.map((key, index) => (
          <li key={key} className="flex items-start gap-2 text-xs text-ivory/90 leading-snug">
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-lime-yellow/20 text-[10px] font-bold text-lime-yellow"
              aria-hidden
            >
              {index + 1}
            </span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
