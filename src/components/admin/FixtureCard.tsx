'use client'

import { APIFootballFixture } from '@/lib/api-football'

interface FixtureCardProps {
  fixture: APIFootballFixture
  isSelected: boolean
  onSelect: () => void
  onDeselect: () => void
  disabled?: boolean
  homeTeamPosition?: number
  awayTeamPosition?: number
}

export function FixtureCard({
  fixture,
  isSelected,
  onSelect,
  onDeselect,
  disabled = false,
  homeTeamPosition,
  awayTeamPosition,
}: FixtureCardProps) {
  const handleClick = () => {
    if (disabled) return
    if (isSelected) {
      onDeselect()
    } else {
      onSelect()
    }
  }

  const fixtureDate = new Date(fixture.fixture.date)
  const formattedDate = fixtureDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = fixtureDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <button
      onClick={handleClick}
      disabled={disabled && !isSelected}
      className={`
        w-full p-4 rounded-[10px] border-2 transition-all text-left
        ${
          isSelected
            ? 'border-lime-yellow bg-lime-yellow bg-opacity-10'
            : 'border-gray-600 bg-midnight-violet hover:border-lime-yellow'
        }
        ${disabled && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ivory opacity-70">{fixture.league.name}</span>
          <span className="text-xs text-ivory opacity-50">•</span>
          <span className="text-xs text-ivory opacity-70">{fixture.league.country}</span>
        </div>
        <div className="text-xs text-ivory opacity-70">
          {formattedDate} {formattedTime}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2 flex-1">
            <img
              src={fixture.teams.home.logo}
              alt={fixture.teams.home.name}
              className="w-8 h-8 object-contain"
            />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm text-ivory font-medium truncate">
                {fixture.teams.home.name}
              </span>
              {homeTeamPosition && (
                <span className="text-xs text-ivory opacity-60 font-medium flex-shrink-0">
                  #{homeTeamPosition}
                </span>
              )}
            </div>
          </div>
          <span className="text-ivory opacity-50">vs</span>
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {awayTeamPosition && (
                <span className="text-xs text-ivory opacity-60 font-medium flex-shrink-0">
                  #{awayTeamPosition}
                </span>
              )}
              <span className="text-sm text-ivory font-medium truncate">
                {fixture.teams.away.name}
              </span>
            </div>
            <img
              src={fixture.teams.away.logo}
              alt={fixture.teams.away.name}
              className="w-8 h-8 object-contain"
            />
          </div>
        </div>
        {isSelected && (
          <div className="ml-4">
            <div className="w-6 h-6 rounded-full bg-lime-yellow flex items-center justify-center">
              <span className="text-midnight-violet text-xs font-bold">✓</span>
            </div>
          </div>
        )}
      </div>

      {fixture.fixture.status.short !== 'NS' && (
        <div className="mt-2 text-xs text-ivory opacity-70">
          Status: {fixture.fixture.status.long}
        </div>
      )}
    </button>
  )
}
