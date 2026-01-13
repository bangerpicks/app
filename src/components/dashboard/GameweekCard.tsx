import { Users } from 'lucide-react'
import { GameweekData } from '@/types/dashboard'

interface GameweekCardProps {
  gameweek: GameweekData
  playerCount: number
}

function StatusBadge({ status }: { status: GameweekData['status'] }) {
  const getStatusColor = () => {
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

  return (
    <div
      className={`${getStatusColor()} px-2.5 py-1.5 rounded-[10px] inline-flex items-center justify-center`}
    >
      <span className="text-base font-bold italic text-midnight-violet">
        {status}
      </span>
    </div>
  )
}

export function GameweekCard({ gameweek, playerCount }: GameweekCardProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-lime-yellow h-[35px] rounded-t-[10px] px-2.5 flex items-center justify-center">
        <h2 className="text-2xl font-black italic tracking-[0.24px] text-midnight-violet text-center">
          {gameweek.name.toUpperCase()}
        </h2>
      </div>

      {/* Body */}
      <div className="border border-lime-yellow rounded-b-[10px] px-2.5 py-2.5 flex flex-col gap-2.5">
        {/* Player Count */}
        <div className="flex items-center justify-center gap-2.5">
          <Users size={18} className="text-ivory" aria-hidden="true" />
          <div className="flex items-center gap-2.5">
            <span className="text-base text-ivory">{playerCount}</span>
            <span className="text-base text-ivory">Players Joined</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <StatusBadge status={gameweek.status} />
        </div>
      </div>
    </div>
  )
}
