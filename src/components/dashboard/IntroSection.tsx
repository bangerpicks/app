'use client'

import { useTranslations } from 'next-intl'
import { Compass, Target, Clock, Trophy, Zap } from 'lucide-react'

const STEPS = [
  { key: 'gameweekHowItWorksStep1', Icon: Compass, stepNumber: 1 },
  { key: 'gameweekHowItWorksStep2', Icon: Target, stepNumber: 2 },
  { key: 'gameweekHowItWorksStep3', Icon: Clock, stepNumber: 3 },
  { key: 'gameweekHowItWorksStep4', Icon: Trophy, stepNumber: 4 },
] as const

interface IntroSectionProps {
  /** When true, shows the compact signed-in banner instead of the full hero + steps. */
  isSignedIn?: boolean
  username?: string
}

export function IntroSection({ isSignedIn = false, username }: IntroSectionProps) {
  const t = useTranslations('dashboard')

  /* ── Compact banner for signed-in users ── */
  if (isSignedIn) {
    return (
      <section className="relative w-full max-w-5xl mx-auto rounded-2xl overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-72 h-20 bg-lime-yellow/8 rounded-full blur-2xl" />

        <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-3.5 bg-midnight-violet/50 border border-ivory/10 rounded-2xl backdrop-blur-md">
          {/* Greeting */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-lime-yellow/15 border border-lime-yellow/30 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-lime-yellow" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-ivory leading-tight truncate">
                {username ? (
                  <>
                    <span className="text-lime-yellow">{username}</span>
                    {' '}
                    <span className="font-normal text-ivory/80">{t('signedInSubtitle')}</span>
                  </>
                ) : (
                  <span className="font-normal text-ivory/80">{t('signedInSubtitle')}</span>
                )}
              </p>
            </div>
          </div>

          {/* Compact step pills */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {STEPS.map(({ Icon, stepNumber }) => (
              <div
                key={stepNumber}
                className="w-7 h-7 rounded-full bg-lime-yellow/10 border border-lime-yellow/20 flex items-center justify-center"
                title={t('step', { number: stepNumber })}
              >
                <Icon className="w-3.5 h-3.5 text-lime-yellow/70" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  /* ── Full hero for guests ── */
  return (
    <section className="relative w-full max-w-5xl mx-auto rounded-2xl bg-midnight-violet/60 border border-ivory/15 backdrop-blur-md p-6 sm:p-8 flex flex-col items-center gap-6 shadow-2xl overflow-hidden">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-lime-yellow/10 rounded-full blur-3xl" />

      {/* Main Title & Subtitle */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-2.5 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight">
          <span className="bg-gradient-to-r from-lime-yellow via-lime-yellow to-amber-glow bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(218,255,0,0.35)]">
            {t('title')}
          </span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl leading-relaxed text-ivory/85 font-medium max-w-xl px-2">
          {t('subtitle')}
        </p>
      </div>

      {/* 4-Step "How It Works" Flow */}
      <div className="relative z-10 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {STEPS.map(({ key, Icon, stepNumber }) => (
          <div
            key={key}
            className="flex items-center lg:flex-col lg:items-center lg:text-center gap-3.5 p-4 rounded-xl bg-midnight-violet/70 border border-ivory/10 hover:border-lime-yellow/40 transition-all duration-200 group"
          >
            <div className="w-11 h-11 rounded-full bg-lime-yellow/15 border border-lime-yellow/30 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-lime-yellow/20 transition-transform">
              <Icon className="w-5 h-5 text-lime-yellow" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-lime-yellow/90">
                {t('step', { number: stepNumber })}
              </span>
              <p className="text-sm text-ivory/85 leading-snug font-normal">
                {t(key)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
