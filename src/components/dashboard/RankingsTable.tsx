'use client'

import { RankingEntry, GameweekRankingData } from '@/types/dashboard'
import Image from 'next/image'

interface RankingsTableProps {
  rankings: RankingEntry[]
  gameweekData: GameweekRankingData
}

export function RankingsTable({
  rankings,
  gameweekData,
}: RankingsTableProps) {
  const { fixtures } = gameweekData
  // Always show 10 columns, pad with empty fixtures if needed
  const displayedFixtures = Array.from({ length: 10 }, (_, i) => 
    fixtures[i] || null
  )

  const getPredictionForFixture = (
    entry: RankingEntry,
    fixtureId: number
  ): 'H' | 'D' | 'A' | null => {
    const matchPred = entry.matchPredictions?.find(
      (mp) => mp.fixtureId === fixtureId
    )
    return matchPred?.prediction ?? null
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse min-w-full border-separate border-spacing-0">
        {/* Header */}
        <thead className="bg-midnight-violet">
          <tr className="border-b-2 border-ivory/20 bg-midnight-violet">
              {/* Rank Column */}
              <th className="sticky left-0 z-[25] bg-midnight-violet px-2 py-2.5 text-left w-12">
                <span className="text-ivory/70 text-xs font-semibold uppercase tracking-wider">
                  Rnk
                </span>
              </th>

              {/* User Column */}
              <th className="sticky left-12 z-[25] bg-midnight-violet px-2 py-2 text-left min-w-[90px] max-w-[100px]">
                <span className="text-ivory/70 text-xs font-semibold uppercase tracking-wider">
                  User
                </span>
              </th>

              {/* Match Columns */}
              {displayedFixtures.map((fixture, index) => (
                <th
                  key={fixture?.fixtureId || `empty-${index}`}
                  className="px-2 py-3 text-center min-w-[60px] bg-midnight-violet"
                >
                  {fixture ? (
                    <div className="flex flex-col items-center gap-1">
                      {/* Home Team Logo */}
                      <div className="w-6 h-6 flex items-center justify-center">
                        {fixture.homeTeam.logo && fixture.homeTeam.logo.trim() ? (
                          <Image
                            src={fixture.homeTeam.logo}
                            alt={fixture.homeTeam.name}
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="w-6 h-6 bg-ivory/10 rounded-full" />
                        )}
                      </div>
                      {/* VS Separator */}
                      <span className="text-ivory/50 text-[8px] font-bold">v</span>
                      {/* Away Team Logo */}
                      <div className="w-6 h-6 flex items-center justify-center">
                        {fixture.awayTeam.logo && fixture.awayTeam.logo.trim() ? (
                          <Image
                            src={fixture.awayTeam.logo}
                            alt={fixture.awayTeam.name}
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="w-6 h-6 bg-ivory/10 rounded-full" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-6 bg-ivory/10 rounded-full" />
                      <span className="text-ivory/30 text-[8px] font-bold">-</span>
                      <div className="w-6 h-6 bg-ivory/10 rounded-full" />
                    </div>
                  )}
                </th>
              ))}

              {/* Points Column */}
              <th className="sticky right-0 z-[25] px-2 py-2 text-right bg-midnight-violet w-14">
                <span className="text-ivory/70 text-xs font-semibold uppercase tracking-wider">
                  Pts.
                </span>
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {rankings.map((entry) => (
              <tr
                key={entry.userId}
                className={`border-b border-ivory/10 ${
                  entry.isCurrentUser
                    ? 'bg-lime-yellow/10 hover:bg-lime-yellow/15'
                    : 'hover:bg-ivory/5'
                }`}
              >
                {/* Rank */}
                <td className="sticky left-0 z-10 bg-midnight-violet px-2 py-2 w-12">
                  <span className="text-ivory font-bold text-sm">
                    {entry.rank}
                  </span>
                </td>

                {/* User */}
                <td className="sticky left-12 z-10 bg-midnight-violet px-2 py-2 min-w-[90px] max-w-[100px]">
                  <span
                    className={`font-semibold text-sm truncate block ${
                      entry.isCurrentUser ? 'text-lime-yellow' : 'text-ivory'
                    }`}
                  >
                    {entry.displayName}
                  </span>
                </td>

                {/* Match Predictions */}
                {displayedFixtures.map((fixture, index) => {
                  if (!fixture) {
                    return (
                      <td key={`empty-${index}`} className="px-2 py-3 text-center">
                        <div className="w-8 h-8 mx-auto bg-ivory/10 rounded flex items-center justify-center">
                          <span className="text-ivory/30 text-xs">-</span>
                        </div>
                      </td>
                    )
                  }
                  const prediction = getPredictionForFixture(
                    entry,
                    fixture.fixtureId
                  )
                  return (
                    <td key={fixture.fixtureId} className="px-2 py-3 text-center">
                      {prediction ? (
                        <div className="w-8 h-8 mx-auto bg-lime-yellow rounded flex items-center justify-center">
                          <span className="text-midnight-violet font-bold text-sm">
                            {prediction}
                          </span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 mx-auto bg-ivory/10 rounded flex items-center justify-center">
                          <span className="text-ivory/30 text-xs">-</span>
                        </div>
                      )}
                    </td>
                  )
                })}

                {/* Points */}
                <td className="sticky right-0 z-10 bg-midnight-violet px-2 py-2 text-right w-14">
                  <span className="text-lime-yellow font-bold text-sm">
                    {entry.weeklyPoints ?? entry.points}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  )
}
