'use client'

import { Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { GameweekCardPhaseChrome } from '@/lib/gameweek-card-phase-chrome'
import type { ReactNode } from 'react'

interface GameweekCardMetaRowProps {
  playerCount: number
  chrome: GameweekCardPhaseChrome
  statusBadge: ReactNode
}

export function GameweekCardMetaRow({
  playerCount,
  chrome,
  statusBadge,
}: GameweekCardMetaRowProps) {
  const t = useTranslations('dashboard')

  return (
    <div
      className={`flex items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 min-h-[44px] ${chrome.metaRow}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Users size={20} className={`shrink-0 ${chrome.usersIcon}`} aria-hidden />
        <p className="min-w-0 leading-none flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
          <span className={`text-lg font-black tabular-nums ${chrome.playersCount}`}>
            {playerCount}
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide ${chrome.playersLabel}`}
          >
            {t('playersJoined')}
          </span>
        </p>
      </div>
      <div className="shrink-0 max-w-[58%] flex justify-end">{statusBadge}</div>
    </div>
  )
}