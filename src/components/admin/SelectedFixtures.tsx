'use client'

import { APIFootballFixture } from '@/lib/api-football'
import { X } from 'lucide-react'

interface SelectedFixturesProps {
  fixtures: APIFootballFixture[]
  onRemove: (fixtureId: number) => void
}

export function SelectedFixtures({
  fixtures,
  onRemove,
}: SelectedFixturesProps) {
  return (
    <div className="bg-midnight-violet border border-lime-yellow rounded-[10px] p-4">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-ivory">
          Selected ({fixtures.length}/10)
        </h3>
        {fixtures.length === 10 && (
          <p className="text-sm text-amber-glow mt-1">
            Maximum fixtures reached
          </p>
        )}
      </div>

      {fixtures.length === 0 ? (
        <p className="text-ivory opacity-50 text-sm">
          No fixtures selected. Select up to 10 fixtures from the search results.
        </p>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {fixtures.map((fixture) => {
            const fixtureDate = new Date(fixture.fixture.date)
            const formattedDate = fixtureDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
            const formattedTime = fixtureDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })

            return (
              <div
                key={fixture.fixture.id}
                className="bg-gray-800 border border-gray-700 rounded-[10px] p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-xs text-ivory opacity-70 mb-1">
                      {fixture.league.name}
                    </div>
                    <div className="text-xs text-ivory opacity-50 mb-2">
                      {formattedDate} {formattedTime}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(fixture.fixture.id)}
                    className="text-ivory hover:text-cinnabar transition-colors ml-2"
                    aria-label="Remove fixture"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <img
                    src={fixture.teams.home.logo}
                    alt={fixture.teams.home.name}
                    className="w-6 h-6 object-contain"
                  />
                  <span className="text-xs text-ivory font-medium truncate flex-1">
                    {fixture.teams.home.name}
                  </span>
                  <span className="text-ivory opacity-50 text-xs">vs</span>
                  <img
                    src={fixture.teams.away.logo}
                    alt={fixture.teams.away.name}
                    className="w-6 h-6 object-contain"
                  />
                  <span className="text-xs text-ivory font-medium truncate flex-1">
                    {fixture.teams.away.name}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
