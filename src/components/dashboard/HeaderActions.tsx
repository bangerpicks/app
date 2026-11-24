'use client'

import { useTranslations } from 'next-intl'
import { UserBadge } from './UserBadge'

interface HeaderActionsProps {
  username?: string
  userPhotoUrl?: string
}

export function HeaderActions({ username, userPhotoUrl }: HeaderActionsProps) {
  const t = useTranslations('dashboard')

  return (
    <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
      <a
        href="/discover/"
        className="inline-flex min-h-[32px] max-w-[5.75rem] items-center justify-center truncate rounded-[10px] border border-lime-yellow/50 bg-lime-yellow/15 px-2 py-1 text-[11px] font-bold leading-tight text-lime-yellow hover:bg-lime-yellow/25 sm:max-w-none sm:px-3 sm:text-sm touch-manipulation"
      >
        {t('joinLeague')}
      </a>
      <UserBadge username={username} userPhotoUrl={userPhotoUrl} />
    </div>
  )
}