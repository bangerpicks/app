'use client'

import { useEffect, useRef } from 'react'
import { Header } from './Header'
import { IntroSection } from './IntroSection'
import { GameweekCard } from './GameweekCard'
import { MatchCard } from './MatchCard'
import { BottomNavigation } from './BottomNavigation'
import { GameweekData, MatchCardData, Prediction } from '@/types/dashboard'

interface DashboardClientProps {
  gameweek: GameweekData
  playerCount: number
  matches: MatchCardData[]
  username?: string
}

export function DashboardClient({
  gameweek,
  playerCount,
  matches,
  username,
}: DashboardClientProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(Date.now())
  const scrollVelocity = useRef(0)

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

  const handlePredictionSelect = (fixtureId: number, prediction: Prediction) => {
    // TODO: Implement prediction submission logic
    console.log('Prediction selected:', { fixtureId, prediction })
  }

  const isDisabled = gameweek.status !== 'OPEN'

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
      <main className="flex-1 px-4 sm:px-5 py-2.5 pb-20 sm:pb-24 flex flex-col items-center gap-5 overflow-x-hidden">
        {/* Intro Section */}
        <IntroSection />

        {/* Gameweek Card */}
        <GameweekCard gameweek={gameweek} playerCount={playerCount} />

        {/* Match Cards */}
        <div className="w-full flex flex-col gap-5">
          {matches.map((match) => (
            <MatchCard
              key={match.fixtureId}
              match={match}
              userPrediction={match.userPrediction}
              onPredictionSelect={handlePredictionSelect}
              disabled={isDisabled}
            />
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
