'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { RankingsTable } from './RankingsTable'
import { ReferralPopup } from './ReferralPopup'
import { RankingEntry, RankingView, GameweekRankingData, PastGameweekOption } from '@/types/dashboard'
import { Trophy, Medal, Award } from 'lucide-react'

interface RankingsClientProps {
  allTimeRankings: RankingEntry[]
  weeklyRankings?: RankingEntry[]
  gameweekData?: GameweekRankingData
  username?: string
  latestCompletedGameweekId?: string | null
  completedGameweeks?: PastGameweekOption[]
  currentGameweekId?: string | null
  selectedGameweekId?: string | null
  onSelectGameweek?: (gameweekId: string | null) => void
  weeklyLoading?: boolean
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
}: {
  entry: RankingEntry
  index: number
  latestCompletedGameweekId: string | null
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

  const cardDelay = Math.min(index * 80, 400)

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border-2 ${getCardClass(entry.rank)} ${
        entry.isCurrentUser ? 'ring-2 ring-lime-yellow' : ''
      }`}
      style={{ animationDelay: `${cardDelay}ms`, animationFillMode: 'both' }}
    >
      {/* Rank */}
      <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
        {getRankIcon(entry.rank) || (
          <span className="text-ivory font-bold text-lg">{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-ivory/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {entry.photoURL ? (
          <img
            src={entry.photoURL}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-ivory/50 text-sm font-bold">
            {(entry.displayName || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* User Info */}
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
            <span className="text-xs text-lime-yellow font-bold">(You)</span>
          )}
          {showLastWeekBadge && lastWeekBadgeKey && (
            <span className="text-xs font-medium text-amber-glow/90">
              {t(lastWeekBadgeKey)}
            </span>
          )}
        </div>
        {entry.totalPredictions !== undefined && (
          <div className="text-xs text-ivory/70 mt-1">
            {entry.correctPredictions || 0}/{entry.totalPredictions} correct
            {entry.accuracy !== undefined && ` • ${entry.accuracy.toFixed(1)}%`}
          </div>
        )}
        <ScoreMathDisplay entry={entry} />
      </div>

      {/* Score (all-time: points + accuracy×0.5) */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-lime-yellow font-bold text-xl">
          {entry.allTimeScore ?? entry.points}
        </span>
        <span className="text-xs text-ivory/70">{t('score')}</span>
      </div>
    </div>
  )
}

export function RankingsClient({
  allTimeRankings,
  weeklyRankings,
  gameweekData,
  username,
  latestCompletedGameweekId = null,
  completedGameweeks = [],
  currentGameweekId = null,
  selectedGameweekId = null,
  onSelectGameweek,
  weeklyLoading = false,
}: RankingsClientProps) {
  const t = useTranslations('rankings')
  const [activeView, setActiveView] = useState<RankingView>('this-week')
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(Date.now())
  const scrollVelocity = useRef(0)

  const isWeeklyView = activeView === 'this-week' || activeView === 'past-weeks'
  const currentRankings =
    isWeeklyView && weeklyRankings
      ? weeklyRankings
      : allTimeRankings

  const showWeekSelector =
    activeView === 'past-weeks' &&
    (currentGameweekId || completedGameweeks.length > 0) &&
    onSelectGameweek

  const canShowPastWeeks =
    (!!weeklyRankings && !!gameweekData) || completedGameweeks.length > 0

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now()
      const scrollY = window.scrollY || window.pageYOffset
      const timeDelta = now - lastScrollTime.current
      const scrollDelta = Math.abs(scrollY - lastScrollY.current)
      const velocity = timeDelta > 0 ? scrollDelta / timeDelta : 0
      scrollVelocity.current = velocity
      lastScrollY.current = scrollY
      lastScrollTime.current = now
    }

    const handleResize = () => {
      // Viewport resize handler
    }

    const handleTouchStart = (e: TouchEvent) => {
      // Touch start handler
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // Touch end handler
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  // REMOVED: Scroll restoration setting - was causing conflicts with Next.js router
  // Next.js manages scroll restoration internally

  return (
    <div ref={containerRef} className="min-h-[100dvh] min-h-screen bg-midnight-violet flex flex-col">
      {/* Header */}
      <Header username={username} />

      {/* Referral Popup */}
      <ReferralPopup />

      {/* Main Content */}
      <main className={`flex-1 px-4 sm:px-5 pb-bottom-nav flex flex-col items-center overflow-x-hidden ${
        activeView === 'this-week' ? 'py-2 gap-2' : 'py-2.5 gap-5'
      }`}>
        {/* Title Section - Only show for All Time view */}
        {!isWeeklyView && (
          <div className="w-full flex flex-col items-center gap-2 mt-4">
            <Trophy className="w-12 h-12 text-lime-yellow mb-2" />
            <h1 className="text-3xl sm:text-4xl font-bold text-ivory">
              {t('title')}
            </h1>
            <p className="text-ivory/70 text-sm sm:text-base">
              {t('subtitle')}
            </p>
            <p className="text-ivory/50 text-xs sm:text-sm max-w-md text-center">
              {t('howRankingWorks')}
            </p>
          </div>
        )}

        {/* View Toggle Buttons */}
        <div className={`w-full max-w-2xl flex gap-2 sm:gap-3 ${isWeeklyView ? 'mt-2' : ''}`}>
          <button
            onClick={() => setActiveView('all-time')}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-colors ${
              activeView === 'all-time'
                ? 'bg-lime-yellow text-midnight-violet'
                : 'bg-ivory/10 text-ivory/70 hover:bg-ivory/15'
            }`}
          >
            {t('allTime')}
          </button>
          <button
            onClick={() => setActiveView('this-week')}
            disabled={!weeklyRankings || !gameweekData}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-colors ${
              activeView === 'this-week'
                ? 'bg-lime-yellow text-midnight-violet'
                : 'bg-ivory/10 text-ivory/70 hover:bg-ivory/15'
            } ${
              !weeklyRankings || !gameweekData
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {t('thisWeek')}
          </button>
          <button
            onClick={() => setActiveView('past-weeks')}
            disabled={!canShowPastWeeks}
            className={`flex-1 py-3 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-colors ${
              activeView === 'past-weeks'
                ? 'bg-lime-yellow text-midnight-violet'
                : 'bg-ivory/10 text-ivory/70 hover:bg-ivory/15'
            } ${!canShowPastWeeks ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {t('pastWeeksTab')}
          </button>
        </div>

        {/* Gameweek Banner and Table (This Week / Past Weeks view) */}
        {isWeeklyView &&
        ((weeklyRankings || weeklyLoading) && (gameweekData || weeklyLoading) || (activeView === 'past-weeks' && completedGameweeks.length > 0)) ? (
          <div className="w-full max-w-2xl">
            {/* Week selector: This week + past weeks */}
            {showWeekSelector && (
              <div className="w-full mb-2">
                <p className="text-ivory/70 text-xs font-medium mb-1.5">{t('selectWeek')}</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {currentGameweekId && (
                    <button
                      type="button"
                      onClick={() => onSelectGameweek(currentGameweekId)}
                      className={`flex-shrink-0 py-2 px-3 rounded-lg font-semibold text-sm transition-colors ${
                        selectedGameweekId === currentGameweekId
                          ? 'bg-lime-yellow text-midnight-violet'
                          : 'bg-ivory/10 text-ivory/70 hover:bg-ivory/15'
                      }`}
                    >
                      {t('thisWeek')}
                    </button>
                  )}
                  {completedGameweeks
                    .filter((gw) => gw.gameweekId !== currentGameweekId)
                    .map((gw) => (
                      <button
                        key={gw.gameweekId}
                        type="button"
                        onClick={() => onSelectGameweek(gw.gameweekId)}
                        className={`flex-shrink-0 py-2 px-3 rounded-lg font-semibold text-sm transition-colors ${
                          selectedGameweekId === gw.gameweekId
                            ? 'bg-lime-yellow text-midnight-violet'
                            : 'bg-ivory/10 text-ivory/70 hover:bg-ivory/15'
                        }`}
                      >
                        {gw.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
            {/* Gameweek Banner */}
            {gameweekData && (
              <>
                {weeklyLoading && selectedGameweekId !== currentGameweekId && (
                  <div className="w-full mb-2 rounded-lg border border-ivory/20 bg-ivory/5 px-3 py-2 flex items-center justify-center">
                    <p className="text-ivory/70 text-sm">{t('loadingWeek')}</p>
                  </div>
                )}
                <div className="w-full bg-lime-yellow rounded-t-lg px-4 py-3">
                  <div className="flex flex-col items-center gap-1">
                    <h2 className="text-midnight-violet font-bold text-lg">
                      {gameweekData.gameweek.name}
                    </h2>
                    <p className="text-midnight-violet/80 text-sm font-semibold">
                      {gameweekData.gameweek.playerCount} {t('players')}
                    </p>
                  </div>
                </div>
                {/* Table view for weekly rankings */}
                <div className="w-full -mt-px">
                  {weeklyRankings ? (
                    <RankingsTable
                      rankings={weeklyRankings}
                      gameweekData={gameweekData}
                      latestCompletedGameweekId={latestCompletedGameweekId}
                    />
                  ) : null}
                </div>
              </>
            )}
            {weeklyLoading && !gameweekData && (
              <div className="w-full rounded-lg border-2 border-ivory/20 bg-ivory/5 px-4 py-8 flex items-center justify-center">
                <p className="text-ivory/70">{t('loadingWeek')}</p>
              </div>
            )}
            {!weeklyLoading && !gameweekData && showWeekSelector && (
              <div className="w-full rounded-lg border-2 border-ivory/20 bg-ivory/5 px-4 py-8 flex items-center justify-center">
                <p className="text-ivory/70 text-sm text-center">{t('selectWeek')}</p>
              </div>
            )}
          </div>
        ) : (
          // Card view for all-time rankings
          <div className="w-full flex flex-col gap-3 max-w-2xl">
            {currentRankings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-ivory/70 text-lg">
                  {t('noRankings')}
                </p>
                <p className="text-ivory/50 text-sm mt-2">
                  {t('startPredicting')}
                </p>
              </div>
            ) : (
              currentRankings.map((entry, index) => (
                <RankingRow
                  key={entry.userId}
                  entry={entry}
                  index={index}
                  latestCompletedGameweekId={latestCompletedGameweekId}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
