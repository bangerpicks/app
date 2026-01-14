'use client'

import { useTranslations } from 'next-intl'

export function IntroSection() {
  const t = useTranslations('dashboard')

  return (
    <section className="flex flex-col items-center py-6 sm:py-8 w-full px-4 sm:px-6 relative">
      {/* Subtle background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-midnight-violet via-midnight-violet/95 to-transparent pointer-events-none" />
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center space-y-4 sm:space-y-5 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight text-center">
          <span className="bg-gradient-to-r from-lime-yellow via-lime-yellow to-amber-glow bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(218,255,0,0.3)]">
            {t('title')}
          </span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl leading-relaxed tracking-wide text-ivory/90 text-center max-w-xl px-4 font-medium">
          {t('subtitle')}
        </p>
        
        {/* Decorative accent line */}
        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-lime-yellow/50 to-transparent rounded-full mt-2" />
      </div>
    </section>
  )
}
