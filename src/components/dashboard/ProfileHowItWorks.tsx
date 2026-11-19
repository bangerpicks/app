'use client'

import { useTranslations } from 'next-intl'
import { Clock, Compass, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const STEPS: {
  key: 'gameweekHowItWorksStep1' | 'gameweekHowItWorksStep2' | 'gameweekHowItWorksStep3'
  Icon: LucideIcon
  stepNumber: number
}[] = [
  { key: 'gameweekHowItWorksStep1', Icon: Compass, stepNumber: 1 },
  { key: 'gameweekHowItWorksStep2', Icon: Target, stepNumber: 2 },
  { key: 'gameweekHowItWorksStep3', Icon: Clock, stepNumber: 3 },
]

export function ProfileHowItWorks() {
  const t = useTranslations('profile')
  const tDashboard = useTranslations('dashboard')

  return (
    <section
      className="w-full max-w-2xl mx-auto mb-6 rounded-xl border border-ivory/20 bg-midnight-violet/50 overflow-hidden"
      data-testid="profile-how-it-works"
      aria-labelledby="profile-how-it-works-title"
    >
      <div className="px-4 py-3 sm:px-4 sm:py-3.5">
        <h2
          id="profile-how-it-works-title"
          className="text-center text-sm font-black uppercase tracking-wider text-lime-yellow"
        >
          {t('howItWorksTitle')}
        </h2>
        <p className="mt-1.5 text-center text-xs sm:text-sm text-ivory/75 leading-snug">
          {t('howItWorksIntro')}
        </p>

        <ol className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {STEPS.map(({ key, Icon, stepNumber }) => (
            <li
              key={key}
              className="flex sm:flex-col sm:items-center sm:text-center gap-2.5 sm:gap-1.5 rounded-lg border border-ivory/10 bg-midnight-violet/40 px-2.5 py-2 sm:px-2 sm:py-2.5"
            >
              <div
                className="w-8 h-8 shrink-0 rounded-full bg-ivory/10 border border-lime-yellow/25 flex items-center justify-center"
                aria-hidden
              >
                <Icon className="w-4 h-4 text-lime-yellow" />
              </div>
              <div className="min-w-0 flex-1 sm:flex-initial">
                <span className="sr-only">{tDashboard('step', { number: stepNumber })}</span>
                <p className="text-xs sm:text-[13px] text-ivory/90 leading-snug">{tDashboard(key)}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-3 pt-2.5 border-t border-ivory/10 text-center text-[11px] sm:text-xs text-ivory/55 leading-snug">
          {t('howItWorksSummary')}
        </p>
      </div>
    </section>
  )
}