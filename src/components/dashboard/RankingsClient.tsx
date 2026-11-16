'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { AppShell } from './AppShell'
import { RankingsTable } from './RankingsTable'
import { ReferralPopup } from './ReferralPopup'
import {
  RankingEntry,
  RankingView,
  GameweekRankingData,
  PastGameweekOption,
} from '@/types/dashboard'
import { SeasonRankingEntry } from '@/lib/seasons'
import { pickPluralKey } from '@/lib/i18n-plural.mjs'
import {
  hasWeeklyRankingsTableRows,
  shouldShowWeeklyStandingsEmpty,
} from '@/lib/weekly-rankings-merge.mjs'
import {
  shouldShowNoActiveWeekCopy,
  shouldShowWeeklyRankingsError,
  shouldShowWeeklyStandingsEmptyCopy,
} from '@/lib/rankings-load-state.mjs'
import { weekNavigationState } from '@/lib/rankings-week-nav.mjs'
import { Trophy, Medal, Award, ChevronLeft, ChevronRight } from 'lucide-react'

interface RankingsClientProps {
  allTimeRankings: RankingEntry[]
  weeklyRankings?: RankingEntry[]
  gameweekData?: GameweekRankingData
  seasonRankings?: SeasonRankingEntry[]
  seasonTitle?: string
  username?: string
  latestCompletedGameweekId?: string | null
  completedGameweeks?: PastGameweekOption[]
  currentGameweekId?: string | null
  selectedGameweekId?: string | null
  onSelectGameweek?: (gameweekId: string | null) => void
  weeklyLoading?: boolean
  seasonLoading?: boolean
  weeklyBoardStatus?: 'idle' | 'loading' | 'ready' | 'no-week' | 'error'
  weeklySliceStatus?: 'idle' | 'loading' | 'loaded' | 'empty' | 'error'
  seasonBoardStatus?: 'idle' | 'loading' | 'ready' | 'empty' | 'error'
  onRetry?: () => void
}

function ScoreMathDisplay({ entry }: { entry: RankingEntry }) {
  const score = entry.allTimeScore ?? entry.points
  const pts = entry.points
  const accuracy = entry.accuracy ?? 0
  const accuracyContribution = Math.round(accuracy * 0.5 * 10) / 10
  if (accuracyContribution === 0 && pts === score) return null
  return (
    <div className="text-xs text-ivory/60 mt-0.5">
      {score} = {pts} pts + {accuracyContribution.toFixed(1)} ({accuracy.toFixed(0)}%×0.5)
    </div>
  )
}

function RankingRow({
  entry,
  index,
  latestCompletedGameweekId,
  scoreLabelKey,
  showSeasonDetail,
}: {
  entry: RankingEntry
  index: number
  latestCompletedGameweekId: string | null
  scoreLabelKey: 'score' | 'points' | 'seasonPoints'
  showSeasonDetail?: boolean
}) {
  const t = useTranslations('rankings')
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-amber-glow" />
    if (rank === 2) return <Medal className="w-6 h-6 text-ivory" />
    if (rank === 3) return <Award className="w-6 h-6 text-amber-glow" />
    return null
  }

  const getCardClass = (rank: number) => {
    if (rank === 1) return 'all-time-card all-time-card-gold'
    if (rank === 2) return 'all-time-card all-time-card-silver'
    if (rank === 3) return 'all-time-card all-time-card-bronze'
    return 'all-time-card'
  }

  const seasonEntry = entry as SeasonRankingEntry
  const showLastWeekBadge =
    scoreLabelKey === 'score' &&
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

  const cardDelay = Math.min(index * 80, 400)
  const displayScore =
    scoreLabelKey === 'score'
      ? (entry.allTimeScore ?? entry.points)
      : scoreLabelKey === 'seasonPoints'
        ? (seasonEntry.seasonPoints ?? entry.points)
        : (entry.weeklyPoints ?? entry.points)

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border-2 ${getCardClass(entry.rank)} ${
        entry.isCurrentUser ? 'ring-2 ring-lime-yellow' : ''
      }`}
      style={{ animationDelay: `${cardDelay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
        {getRankIcon(entry.rank) || (
          <span className="text-ivory font-bold text-lg">{entry.rank}</span>
        )}
      </div>

      <div className="w-10 h-10 rounded-full bg-ivory/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {entry.photoURL ? (
          <img src={entry.photoURL} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-ivory/50 text-sm font-bold">
            {(entry.displayName || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-semibold text-ivory truncate ${
              entry.isCurrentUser ? 'text-lime-yellow' : ''
            }`}
          >
            {entry.displayName}
          </span>
          {entry.isCurrentUser && (
            <span className="text-xs text-lime-yellow font-bold">{t('you')}</span>
          )}
          {showLastWeekBadge && lastWeekBadgeKey && (
            <span className="text-xs font-medium text-amber-glow/90">{t(lastWeekBadgeKey)}</span>
          )}
        </div>
        {showSeasonDetail && seasonEntry.totalCorrect !== undefined && (
          <div className="text-xs text-ivory/70 mt-1">
            {t(
              pickPluralKey(
                seasonEntry.totalCorrect,
                'seasonCorrectPicksOne',
                'seasonCorrectPicksMany'
              ),
              { count: seasonEntry.totalCorrect }
            )}
          </div>
        )}
        {scoreLabelKey === 'score' && entry.totalPredictions !== undefined && (
          <div className="text-xs text-ivory/70 mt-1">
            {entry.correctPredictions || 0}/{entry.totalPredictions} {t('correctShort')}
            {entry.accuracy !== undefined && ` • ${entry.accuracy.toFixed(1)}%`}
          </div>
        )}
        {scoreLabelKey === 'score' && <ScoreMathDisplay entry={entry} />}
      </div>

      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-lime-yellow font-bold text-xl">{displayScore}</span>
        <span className="text-xs text-ivory/70">{t(scoreLabelKey)}</span>
      </div>
    </div>
  )
}

export function RankingsClient({
  allTimeRankings,
  weeklyRankings,
  gameweekData,
  seasonRankings = [],
  seasonTitle,
  username,
  latestCompletedGameweekId = null,
  completedGameweeks = [],
  currentGameweekId = null,
  selectedGameweekId = null,
  onSelectGameweek,
  weeklyLoading = false,
  seasonLoading = false,
  weeklyBoardStatus = 'idle',
  weeklySliceStatus = 'idle',
  seasonBoardStatus = 'idle',
  onRetry,
}: RankingsClientProps) {
  const t = useTranslations('rankings')
  const [activeView, setActiveView] = useState<RankingView>('this-week')
  const containerRef = useRef<HTMLDivElement>(null)

  const isThisWeekView = activeView === 'this-week'
  const isHallOfFame = activeView === 'hall-of-fame'
  const isSeasonView = activeView === 'season'

  const navigableWeeks = (() => {
    const past = completedGameweeks.filter(
      (gw) => gw.gameweekId !== currentGameweekId
    )
    if (currentGameweekId) {
      const currentName =
        gameweekData?.gameweek.gameweekId === currentGameweekId
          ? gameweekData.gameweek.name
          : t('thisWeek')
      return [
        { gameweekId: currentGameweekId, name: currentName },
        ...past,
      ]
    }
    return past
  })()

  const selectedWeekIndex =
    selectedGameweekId != null
      ? navigableWeeks.findIndex((gw) => gw.gameweekId === selectedGameweekId)
      : -1
  const weekNav = weekNavigationState(
    selectedWeekIndex,
    navigableWeeks.length
  )

  const hallOfFameList = allTimeRankings
  const playerCount = gameweekData?.gameweek.playerCount ?? 0
  const showWeeklyError = shouldShowWeeklyRankingsError(
    playerCount,
    weeklySliceStatus,
    weeklyBoardStatus
  )
  const showWeeklyEmptyCopy = shouldShowWeeklyStandingsEmptyCopy(
    weeklyBoardStatus,
    weeklySliceStatus,
    playerCount
  )
  const showNoActiveWeek = shouldShowNoActiveWeekCopy(weeklyBoardStatus, weeklyLoading)
  const legacyEmptyOk = shouldShowWeeklyStandingsEmpty(weeklyRankings, weeklyLoading, {
    boardStatus: weeklyBoardStatus,
    sliceStatus: weeklySliceStatus,
  })

  useEffect(() => {
    const noop = () => {}
    window.addEventListener('scroll', noop, { passive: true })
    return () => window.removeEventListener('scroll', noop)
  }, [])

  return (
    <AppShell
      containerRef={containerRef}
      username={username}
      banner={<ReferralPopup />}
      mainClassName={`flex-1 px-4 sm:px-5 pb-bottom-nav flex flex-col items-center overflow-x-hidden ${
        isThisWeekView ? 'py-2 gap-2' : 'py-2.5 gap-5'
      }`}
    >
      {(isHallOfFame || isSeasonView) && (
        <div className="w-full flex flex-col items-center gap-2 mt-4">
          <Trophy className="w-12 h-12 text-lime-yellow mb-2" />
          <h1 className="text-3xl sm:text-4xl font-bold text-ivory">{t('title')}</h1>
          <p className="text-ivory/70 text-sm sm:text-base">{t('subtitle')}</p>
          {isHallOfFame && (
            <p className="text-ivory/50 text-xs sm:text-sm max-w-md text-center">
              {t('hallOfFameBlurb')}
            </p>
          )}
          {isSeasonView && seasonTitle && (
            <p className="text-lime-yellow text-sm font-semibold">{seasonTitle}</p>
          )}
          {isSeasonView && (
            <p className="text-ivory/50 text-xs sm:text-sm max-w-md text-center">
              {t('seasonBlurb')}
            </p>
          )}
        </div>
      )}

      <div
        className={`w-full max-w-2xl lg:max-w-4xl flex gap-2 sm:gap-3 ${isThisWeekView ? 'mt-2' : ''}`}
      >
        <button
          onClick={() => setActiveView('this-week')}
          className={`flex-1 py-3 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-colors ${
            activeView === 'this-week'
              ? 'bg-lime-yellow text-midnight-violet'
              : 'bg-ivory/10 text-ivory/70 hover:bg-ivory/15'
          }`}
        >
          {t('thisWeek')}
        </button>
        <button
          onClick={() => setActiveView('season')}
          className={`flex-1 py-3 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-colors ${
            activeView === 'season'
              ? 'bg-lime-yellow text-midnight-violet'
              : 'bg-ivory/10 text-ivory/70 hover:bg-ivory/15'
          }`}
        >
          {t('season')}
        </button>
        <button
          onClick={() => setActiveView('hall-of-fame')}
          className={`flex-1 py-3 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-colors ${
            activeView === 'hall-of-fame'
              ? 'bg-lime-yellow text-midnight-violet'
              : 'bg-ivory/10 text-ivory/70 hover:bg-ivory/15'
          }`}
        >
          {t('hallOfFame')}
        </button>
      </div>

      {isThisWeekView && (
        <div className="w-full max-w-2xl lg:max-w-4xl">
          {gameweekData && (
            <>
              {weeklyLoading && selectedGameweekId !== currentGameweekId && (
                <div className="w-full mb-2 rounded-lg border border-ivory/20 bg-ivory/5 px-3 py-2 flex items-center justify-center">
                  <p className="text-ivory/70 text-sm">{t('loadingWeek')}</p>
                </div>
              )}
              <div className="w-full bg-lime-yellow rounded-t-lg px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  {navigableWeeks.length > 1 && onSelectGameweek && (
                    <button
                      type="button"
                      disabled={!weekNav.canGoToOlderWeek}
                      onClick={() => {
                        if (
                          weekNav.canGoToOlderWeek &&
                          weekNav.olderWeekIndex != null
                        ) {
                          onSelectGameweek(
                            navigableWeeks[weekNav.olderWeekIndex].gameweekId
                          )
                        }
                      }}
                      className="p-1.5 rounded-lg text-midnight-violet disabled:opacity-30 hover:bg-midnight-violet/10 transition-colors flex-shrink-0"
                      aria-label={t('previousWeek')}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
                  <h2 className="text-midnight-violet font-bold text-base sm:text-lg text-center truncate max-w-full">
                    {gameweekData.gameweek.name}
                  </h2>
                  <p className="text-midnight-violet/80 text-xs sm:text-sm font-semibold">
                    {t(
                      pickPluralKey(
                        gameweekData.gameweek.playerCount,
                        'playerCountOne',
                        'playerCountMany'
                      ),
                      { count: gameweekData.gameweek.playerCount }
                    )}
                  </p>
                  </div>
                  {navigableWeeks.length > 1 && onSelectGameweek && (
                    <button
                      type="button"
                      disabled={!weekNav.canGoToNewerWeek}
                      onClick={() => {
                        if (
                          weekNav.canGoToNewerWeek &&
                          weekNav.newerWeekIndex != null
                        ) {
                          onSelectGameweek(
                            navigableWeeks[weekNav.newerWeekIndex].gameweekId
                          )
                        }
                      }}
                      className="p-1.5 rounded-lg text-midnight-violet disabled:opacity-30 hover:bg-midnight-violet/10 transition-colors flex-shrink-0"
                      aria-label={t('nextWeek')}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full -mt-px">
                {hasWeeklyRankingsTableRows(weeklyRankings) ? (
                  <RankingsTable
                    rankings={weeklyRankings!}
                    gameweekData={gameweekData}
                    latestCompletedGameweekId={latestCompletedGameweekId}
                  />
                ) : showWeeklyError ? (
                  <div className="w-full rounded-b-lg border-2 border-t-0 border-ivory/20 bg-midnight-violet px-4 py-10 flex flex-col items-center justify-center gap-3">
                    <p className="text-ivory/80 text-sm text-center max-w-sm">{t('loadFailed')}</p>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="bg-lime-yellow text-midnight-violet py-2 px-5 rounded-lg font-semibold text-sm"
                      >
                        {t('tryAgain')}
                      </button>
                    )}
                  </div>
                ) : showWeeklyEmptyCopy || legacyEmptyOk ? (
                  <div className="w-full rounded-b-lg border-2 border-t-0 border-ivory/20 bg-midnight-violet px-4 py-10 flex items-center justify-center">
                    <p className="text-ivory/70 text-sm text-center max-w-sm">
                      {t('weeklyStandingsEmpty')}
                    </p>
                  </div>
                ) : null}
              </div>
            </>
          )}
          {weeklyLoading && !gameweekData && (
            <div className="w-full rounded-lg border-2 border-ivory/20 bg-ivory/5 px-4 py-8 flex items-center justify-center">
              <p className="text-ivory/70">{t('loadingWeek')}</p>
            </div>
          )}
          {!weeklyLoading && weeklyBoardStatus === 'error' && !gameweekData && (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <p className="text-ivory/80 text-sm max-w-sm">{t('loadFailed')}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="bg-lime-yellow text-midnight-violet py-2 px-5 rounded-lg font-semibold text-sm"
                >
                  {t('tryAgain')}
                </button>
              )}
            </div>
          )}
          {showNoActiveWeek && (
            <div className="text-center py-12">
              <p className="text-ivory/70 text-lg">{t('noRankings')}</p>
            </div>
          )}
        </div>
      )}

      {isSeasonView && (
        <div className="w-full flex flex-col gap-3 max-w-2xl lg:max-w-4xl">
          {seasonLoading || seasonBoardStatus === 'loading' ? (
            <div className="text-center py-12 text-ivory/70">{t('loadingSeason')}</div>
          ) : seasonBoardStatus === 'error' ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <p className="text-ivory/80 text-sm max-w-sm">{t('loadFailed')}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="bg-lime-yellow text-midnight-violet py-2 px-5 rounded-lg font-semibold text-sm"
                >
                  {t('tryAgain')}
                </button>
              )}
            </div>
          ) : seasonRankings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-ivory/70 text-lg">{t('noSeasonStandings')}</p>
            </div>
          ) : (
            seasonRankings.map((entry, index) => (
              <RankingRow
                key={entry.userId}
                entry={entry}
                index={index}
                latestCompletedGameweekId={null}
                scoreLabelKey="seasonPoints"
                showSeasonDetail
              />
            ))
          )}
        </div>
      )}

      {isHallOfFame && (
        <div className="w-full flex flex-col gap-3 max-w-2xl lg:max-w-4xl">
          {hallOfFameList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-ivory/70 text-lg">{t('noRankings')}</p>
              <p className="text-ivory/50 text-sm mt-2">{t('startPredicting')}</p>
            </div>
          ) : (
            hallOfFameList.map((entry, index) => (
              <RankingRow
                key={entry.userId}
                entry={entry}
                index={index}
                latestCompletedGameweekId={latestCompletedGameweekId}
                scoreLabelKey="score"
              />
            ))
          )}
        </div>
      )}
    </AppShell>
  )
}