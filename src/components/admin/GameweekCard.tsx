'use client'

import { AdminGameweekData } from '@/types/admin'
import { GameweekStatusBadge } from './GameweekStatusBadge'
import { Edit, Trash2, Copy, Power, PowerOff, TestTube } from 'lucide-react'

interface GameweekCardProps {
  gameweek: AdminGameweekData
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onToggleStatus: () => void
  onToggleForceOpen: () => void
}

export function GameweekCard({
  gameweek,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
  onToggleForceOpen,
}: GameweekCardProps) {
  const startDate = gameweek.startDate.toDate()
  const endDate = gameweek.endDate.toDate()
  const formattedStartDate = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedEndDate = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const isActive = gameweek.status === 'active'
  const isForceOpen = gameweek.forceOpenForTesting === true

  return (
    <div className={`bg-midnight-violet border rounded-[10px] p-4 hover:border-lime-yellow transition-colors ${
      isForceOpen ? 'border-amber-500' : 'border-lime-yellow'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-ivory">{gameweek.name}</h3>
            {isForceOpen && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded">
                FORCE OPEN
              </span>
            )}
          </div>
          {gameweek.description && (
            <p className="text-sm text-ivory opacity-70 mb-2">
              {gameweek.description}
            </p>
          )}
        </div>
        <GameweekStatusBadge status={gameweek.status} />
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-ivory">
          <span className="opacity-70">Date Range:</span>
          <span>
            {formattedStartDate} - {formattedEndDate}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-ivory">
          <span className="opacity-70">Fixtures:</span>
          <span>{gameweek.fixtureIds.length}/10</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-ivory">
          <span className="opacity-70">Created:</span>
          <span>
            {gameweek.createdAt.toDate().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-3 border-t border-gray-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-3 py-1.5 bg-lime-yellow text-midnight-violet rounded-[10px] font-medium hover:bg-yellow-400 transition-colors text-sm"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={onDuplicate}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-glow text-midnight-violet rounded-[10px] font-medium hover:bg-orange-400 transition-colors text-sm"
          >
            <Copy size={16} />
            Duplicate
          </button>
          <button
            onClick={onToggleStatus}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-[10px] font-medium transition-colors text-sm ${
              isActive
                ? 'bg-gray-600 text-ivory hover:bg-gray-700'
                : 'bg-lime-yellow text-midnight-violet hover:bg-yellow-400'
            }`}
          >
            {isActive ? <PowerOff size={16} /> : <Power size={16} />}
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-3 py-1.5 bg-cinnabar text-ivory rounded-[10px] font-medium hover:bg-red-600 transition-colors text-sm"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
        <button
          onClick={onToggleForceOpen}
          className={`w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-[10px] font-medium transition-colors text-sm ${
            isForceOpen
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-gray-700 text-ivory hover:bg-gray-600'
          }`}
          title={isForceOpen ? 'Disable force open (restore normal deadline rules)' : 'Enable force open for testing (allows predictions during live matches)'}
        >
          <TestTube size={16} />
          {isForceOpen ? 'Force Open: ON' : 'Force Open: OFF'}
        </button>
      </div>
    </div>
  )
}
