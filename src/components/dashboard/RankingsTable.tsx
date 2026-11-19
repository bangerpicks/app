'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { RankingEntry, GameweekRankingData } from '@/types/dashboard'
import { RankingsTableScrollArea } from './RankingsTableScrollArea'

interface RankingsTableProps {
  rankings: RankingEntry[]
  gameweekData: GameweekRankingData
  latestCompletedGameweekId?: string | null
}

export function RankingsTable({
  rankings,
  gameweekData,
  latestCompletedGameweekId = null,
}: RankingsTableProps) {
  const t = useTranslations('rankings')
  const { fixtures } = gameweekData
  // Always show 10 columns, pad with empty fixtures if needed
  const displayedFixtures = Array.from({ length: 10 }, (_, i) => 
    fixtures[i] || null
  )

  const getPredictionForFixture = (
    entry: RankingEntry,
    fixtureId: number
  ): { prediction: 'H' | 'D' | 'A' | null; correct: boolean | null | undefined } => {
    const matchPred = entry.matchPredictions?.find(
      (mp) => mp.fixtureId === fixtureId
    )
    return {
      prediction: matchPred?.prediction ?? null,
      correct: matchPred?.correct ?? null,
    }
  }

  return (
    <RankingsTableScrollArea>
      <table className="w-full border-collapse min-w-full border-separate border-spacing-0">
        {/* Header */}
        <thead className="bg-midnight-violet">
          <tr className="border-b-2 border-ivory/20 bg-midnight-violet">
              {/* Rank Column */}
              <th className="sticky left-0 z-[25] bg-midnight-violet px-2 py-2.5 text-left w-12">
                <span className="text-ivory/70 text-xs font-semibold uppercase tracking-wider">
                  {t('rank')}
                </span>
              </th>

              {/* User Column */}
              <th className="sticky left-12 z-[25] bg-midnight-violet px-2 py-2 text-left w-[96px] min-w-[96px] max-w-[96px] sm:w-auto sm:min-w-[140px] sm:max-w-none">
                <span className="text-ivory/70 text-xs font-semibold uppercase tracking-wider">
                  {t('user')}
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
                            className="object-contain w-full h-full"
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
                            className="object-contain w-full h-full"
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
              <th className="sticky right-0 z-[25] px-2 py-2 text-right bg-midnight-violet w-11 sm:w-14">
                <span className="text-ivory/70 text-xs font-semibold uppercase tracking-wider">
                  {t('points')}
                </span>
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {rankings.map((entry, rowIndex) => {
              const showLastWeekBadge =
                latestCompletedGameweekId &&
                entry.lastCompletedGameweekId === latestCompletedGameweekId &&
                (entry.lastWeekPlace === 1 || entry.lastWeekPlace === 2 || entry.lastWeekPlace === 3)
              const lastWeekBadgeKey =
                entry.lastWeekPlace === 1
                  ? 'lastWeekChampion'
                  : entry.lastWeekPlace === 2
                    ? 'lastWeek2nd'
                    : entry.lastWeekPlace === 3
                      ? 'lastWeek3rd'
                      : null
              return (
              <tr
                key={entry.userId}
                className="border-b border-ivory/10 [@media(hover:hover)]:hover:bg-ivory/5"
              >
                {/* Rank */}
                <td className="sticky left-0 z-10 bg-midnight-violet px-2 py-2 w-12">
                  <span className="text-ivory font-bold text-sm">
                    {entry.rank}
                  </span>
                </td>

                {/* User */}
                <td className="sticky left-12 z-10 bg-midnight-violet px-2 py-2 w-[96px] min-w-[96px] max-w-[96px] sm:w-auto sm:min-w-[140px] sm:max-w-none">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-ivory/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {entry.photoURL ? (
                        <Image
                          src={entry.photoURL}
                          alt=""
                          width={28}
                          height={28}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-ivory/50 text-[10px] sm:text-xs font-bold">
                          {(entry.displayName || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span
                        className={`font-semibold text-xs sm:text-sm block leading-tight line-clamp-2 break-all sm:line-clamp-none sm:truncate ${
                          entry.isCurrentUser ? 'text-lime-yellow' : 'text-ivory'
                        }`}
                        title={entry.displayName}
                      >
                        {entry.displayName}
                      </span>
                      {showLastWeekBadge && lastWeekBadgeKey && (
                        <>
                          <span className="text-[10px] sm:hidden font-medium text-amber-glow/90 leading-tight">
                            {t(`${lastWeekBadgeKey}Short`)}
                          </span>
                          <span className="hidden sm:inline text-xs font-medium text-amber-glow/90">
                            {t(lastWeekBadgeKey)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
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
                  const { prediction, correct } = getPredictionForFixture(
                    entry,
                    fixture.fixtureId
                  )
                  
                  // Determine background color based on correctness
                  const getBackgroundColor = () => {
                    if (!prediction) {
                      return 'bg-ivory/10' // No prediction
                    }
                    if (correct === true) {
                      return 'bg-lime-yellow' // Correct prediction
                    }
                    if (correct === false) {
                      return 'bg-red-500/70' // Incorrect prediction
                    }
                    return 'bg-ivory/20' // Pending/unknown (not yet scored)
                  }
                  
                  const getTextColor = () => {
                    if (correct === true) {
                      return 'text-midnight-violet' // Correct - dark text on lime-yellow
                    }
                    if (correct === false) {
                      return 'text-white' // Incorrect - white text on red
                    }
                    return 'text-ivory' // Pending - ivory text
                  }
                  
                  return (
                    <td key={fixture.fixtureId} className="px-2 py-3 text-center">
                      {prediction ? (
                        <div className={`w-8 h-8 mx-auto ${getBackgroundColor()} rounded flex items-center justify-center`}>
                          <span className={`${getTextColor()} font-bold text-sm`}>
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
                <td className="sticky right-0 z-10 bg-midnight-violet px-2 py-2 text-right w-11 sm:w-14">
                  <span className="text-lime-yellow font-bold text-sm">
                    {entry.weeklyPoints ?? entry.points}
                  </span>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
    </RankingsTableScrollArea>
  )
}
