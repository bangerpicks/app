'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { MY_GAMES_HOME_PATH } from '@/lib/app-routes'

/**
 * Root is only a bounce to My games. Use a hard navigation so we never
 * depend on App Router soft-nav (which can hang with static export / trailingSlash).
 */
export default function HomePage() {
  const t = useTranslations('common')
  useEffect(() => {
    window.location.replace(MY_GAMES_HOME_PATH)
  }, [])

  return (
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
      <div className="text-ivory">{t('redirecting')}</div>
    </div>
  )
}
