'use client'

import { GameweekStatus } from '@/types/admin'

interface GameweekStatusBadgeProps {
  status: GameweekStatus
}

export function GameweekStatusBadge({ status }: GameweekStatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500'
      case 'active':
        return 'bg-lime-yellow'
      case 'completed':
        return 'bg-gray-500'
      case 'archived':
        return 'bg-amber-glow'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    return status.charAt(0).toUpperCase() + status.slice(1).toUpperCase()
  }

  return (
    <div
      className={`${getStatusColor()} px-2.5 py-1.5 rounded-[10px] inline-flex items-center justify-center`}
    >
      <span className="text-base font-bold italic text-midnight-violet">
        {getStatusText()}
      </span>
    </div>
  )
}
