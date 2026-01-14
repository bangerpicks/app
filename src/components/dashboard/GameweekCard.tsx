'use client'

import { Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { GameweekData } from '@/types/dashboard'
import { useCountdown } from '@/hooks/useCountdown'
import { useMemo } from 'react'

interface GameweekCardProps {
  gameweek: GameweekData
  playerCount: number
}

interface StatusBadgeProps {
  status: GameweekData['status']
  deadline?: Date
}

function StatusBadge({ status, deadline }: StatusBadgeProps) {
  const { time, formatted } = useCountdown(status === 'OPEN' ? deadline : null)

  // Determine urgency level based on time remaining
  const urgencyLevel = useMemo(() => {
    if (!time || time.isExpired || time.total <= 0) {
      return 'expired'
    }
    const minutesRemaining = time.total / (1000 * 60)
    if (minutesRemaining < 15) {
      return 'critical'
    }
    if (minutesRemaining < 60) {
      return 'warning'
    }
    return 'normal'
  }, [time])

  const getStatusColor = () => {
    // Override color based on urgency for OPEN status
    if (status === 'OPEN' && urgencyLevel === 'critical') {
      return 'bg-cinnabar'
    }
    if (status === 'OPEN' && urgencyLevel === 'warning') {
      return 'bg-amber-glow'
    }

    switch (status) {
      case 'OPEN':
        return 'bg-lime-yellow'
      case 'CLOSED':
        return 'bg-cinnabar'
      case 'UPCOMING':
        return 'bg-amber-glow'
      case 'COMPLETED':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const shouldPulse = status === 'OPEN' && (urgencyLevel === 'warning' || urgencyLevel === 'critical')
  const pulseIntensity = urgencyLevel === 'critical' ? 'animate-pulse' : 'animate-pulse-slow'

  return (
    <div
      className={`${getStatusColor()} px-2.5 py-1.5 rounded-[10px] inline-flex items-center justify-center gap-2 transition-all duration-300 ${
        shouldPulse ? pulseIntensity : ''
      }`}
      role="status"
      aria-live="polite"
      aria-label={
        status === 'OPEN' && deadline && !time.isExpired
          ? `Gameweek is open. Time remaining: ${formatted}`
          : `Gameweek status: ${status}`
      }
    >
      <span className="text-base font-bold italic text-midnight-violet">
        {status}
      </span>
      {status === 'OPEN' && deadline && !time.isExpired && (
        <>
          <span className="text-midnight-violet/70">•</span>
          <span className="text-sm font-semibold text-midnight-violet tabular-nums">
            {formatted}
          </span>
        </>
      )}
    </div>
  )
}

export function GameweekCard({ gameweek, playerCount }: GameweekCardProps) {
  const t = useTranslations('dashboard')

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="bg-lime-yellow h-[35px] rounded-t-[10px] px-2.5 flex items-center justify-center shadow-sm">
        <h2 className="text-2xl font-black italic tracking-[0.24px] text-midnight-violet text-center">
          {gameweek.name.toUpperCase()}
        </h2>
      </div>

      {/* Body */}
      <div className="border border-lime-yellow rounded-b-[10px] px-3 py-4 flex flex-col gap-4 bg-midnight-violet/50 backdrop-blur-sm transition-all duration-300 hover:border-lime-yellow/80">
        {/* Player Count */}
        <div className="flex items-center justify-center gap-3">
          <Users size={20} className="text-ivory transition-transform duration-200 hover:scale-110" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-ivory">{playerCount}</span>
            <span className="text-base text-ivory/90">{t('playersJoined')}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <StatusBadge status={gameweek.status} deadline={gameweek.deadline} />
        </div>
      </div>
    </div>
  )
}
