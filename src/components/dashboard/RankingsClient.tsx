'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { RankingsTable } from './RankingsTable'
import { RankingEntry, RankingView, GameweekRankingData } from '@/types/dashboard'
import { Trophy, Medal, Award } from 'lucide-react'

interface RankingsClientProps {
  allTimeRankings: RankingEntry[]
  weeklyRankings?: RankingEntry[]
  gameweekData?: GameweekRankingData
  username?: string
}

function RankingRow({ entry, index }: { entry: RankingEntry; index: number }) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-amber-glow" />
    if (rank === 2) return <Medal className="w-6 h-6 text-ivory" />
    if (rank === 3) return <Award className="w-6 h-6 text-amber-glow" />
    return null
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-amber-glow/20 border-amber-glow/50'
    if (rank === 2) return 'bg-ivory/10 border-ivory/30'
    if (rank === 3) return 'bg-amber-glow/10 border-amber-glow/30'
    return 'bg-midnight-violet/50 border-ivory/10'
  }

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border-2 ${getRankColor(
        entry.rank
      )} ${entry.isCurrentUser ? 'ring-2 ring-lime-yellow' : ''}`}
    >
      {/* Rank */}
      <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
        {getRankIcon(entry.rank) || (
          <span className="text-ivory font-bold text-lg">{entry.rank}</span>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
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
        </div>
        {entry.totalPredictions !== undefined && (
          <div className="text-xs text-ivory/70 mt-1">
            {entry.correctPredictions || 0}/{entry.totalPredictions} correct
            {entry.accuracy !== undefined && ` • ${entry.accuracy.toFixed(1)}%`}
          </div>
        )}
      </div>

      {/* Points */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-lime-yellow font-bold text-xl">
          {entry.points}
        </span>
        <span className="text-xs text-ivory/70">pts</span>
      </div>
    </div>
  )
}

export function RankingsClient({
  allTimeRankings,
  weeklyRankings,
  gameweekData,
  username,
}: RankingsClientProps) {
  const t = useTranslations('rankings')
  const [activeView, setActiveView] = useState<RankingView>('all-time')
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(Date.now())
  const scrollVelocity = useRef(0)

  const currentRankings =
    activeView === 'this-week' && weeklyRankings
      ? weeklyRankings
      : allTimeRankings

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

  useEffect(() => {
    // Disable Next.js scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  return (
    <div ref={containerRef} className="min-h-[100dvh] min-h-screen bg-midnight-violet flex flex-col">
      {/* Header */}
      <Header username={username} />

      {/* Main Content */}
      <main className={`flex-1 px-4 sm:px-5 pb-20 sm:pb-24 flex flex-col items-center overflow-x-hidden ${
        activeView === 'this-week' ? 'py-2 gap-2' : 'py-2.5 gap-5'
      }`}>
        {/* Title Section - Only show for All Time view */}
        {activeView !== 'this-week' && (
          <div className="w-full flex flex-col items-center gap-2 mt-4">
            <Trophy className="w-12 h-12 text-lime-yellow mb-2" />
            <h1 className="text-3xl sm:text-4xl font-bold text-ivory">
              {t('title')}
            </h1>
            <p className="text-ivory/70 text-sm sm:text-base">
              {t('subtitle')}
            </p>
          </div>
        )}

        {/* View Toggle Buttons */}
        <div className={`w-full max-w-2xl flex gap-3 ${activeView === 'this-week' ? 'mt-2' : ''}`}>
          <button
            onClick={() => setActiveView('all-time')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
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
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
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
        </div>

        {/* Gameweek Banner and Table (This Week view only) */}
        {activeView === 'this-week' &&
        weeklyRankings &&
        gameweekData ? (
          <div className="w-full max-w-2xl">
            {/* Gameweek Banner */}
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
              <RankingsTable
                rankings={weeklyRankings}
                gameweekData={gameweekData}
              />
            </div>
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
                <RankingRow key={entry.userId} entry={entry} index={index} />
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
