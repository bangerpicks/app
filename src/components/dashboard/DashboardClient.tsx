'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { ensureUserDocument } from '@/lib/users'
import { savePredictions } from '@/lib/predictions'
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
  const { user } = useAuth()
  const t = useTranslations('dashboard')
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(Date.now())
  const scrollVelocity = useRef(0)

  // State for pending predictions (not yet saved)
  const [pendingPredictions, setPendingPredictions] = useState<Map<number, Prediction>>(new Map())
  // State for saved predictions (loaded from Firestore, merged into matches)
  const [savedPredictions, setSavedPredictions] = useState<Map<number, Prediction>>(new Map())
  // Loading and error states
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

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

  // Initialize saved predictions from matches prop
  useEffect(() => {
    const saved = new Map<number, Prediction>()
    matches.forEach((match) => {
      if (match.userPrediction) {
        saved.set(match.fixtureId, match.userPrediction)
      }
    })
    setSavedPredictions(saved)
  }, [matches])

  const isDisabled = gameweek.status !== 'OPEN'

  const handlePredictionSelect = (fixtureId: number, prediction: Prediction) => {
    if (isDisabled || isSaving) return

    setPendingPredictions((prev) => {
      const next = new Map(prev)
      next.set(fixtureId, prediction)
      return next
    })
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleSubmit = async () => {
    if (!user || pendingPredictions.size === 0 || isDisabled || isSaving) {
      return
    }

    // Validate gameweek is still OPEN
    if (gameweek.status !== 'OPEN') {
      setSaveError(t('gameweekClosed'))
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      // Ensure user document exists
      await ensureUserDocument(user, username || user.displayName || 'Player')

      // Save predictions
      await savePredictions(user.uid, pendingPredictions, matches)

      // Move pending predictions to saved
      setSavedPredictions((prev) => {
        const next = new Map(prev)
        pendingPredictions.forEach((prediction, fixtureId) => {
          next.set(fixtureId, prediction)
        })
        return next
      })

      // Clear pending predictions
      setPendingPredictions(new Map())
      setSaveSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    } catch (error: any) {
      console.error('Error saving predictions:', error)
      setSaveError(error.message || 'Failed to save predictions. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Merge pending and saved predictions for display
  const getDisplayPrediction = (fixtureId: number): Prediction | null => {
    // Pending predictions take precedence (shows unsaved changes)
    if (pendingPredictions.has(fixtureId)) {
      return pendingPredictions.get(fixtureId) || null
    }
    // Otherwise show saved prediction
    return savedPredictions.get(fixtureId) || null
  }

  useEffect(() => {
    // Disable Next.js scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  const hasPendingPredictions = pendingPredictions.size > 0

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
              userPrediction={getDisplayPrediction(match.fixtureId)}
              onPredictionSelect={handlePredictionSelect}
              disabled={isDisabled || isSaving}
            />
          ))}
        </div>

        {/* Submit Button & Feedback */}
        {user && !isDisabled && (
          <div className="w-full flex flex-col gap-3 max-w-md">
            {/* Error Message */}
            {saveError && (
              <div className="bg-cinnabar/20 border border-cinnabar/40 rounded-lg px-4 py-3 text-cinnabar text-sm">
                {saveError}
              </div>
            )}

            {/* Success Message */}
            {saveSuccess && (
              <div className="bg-lime-yellow/20 border border-lime-yellow/40 rounded-lg px-4 py-3 text-lime-yellow text-sm">
                {t('savedSuccessfully')}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!hasPendingPredictions || isSaving || !user}
              className="w-full bg-lime-yellow text-midnight-violet py-3 px-4 rounded-lg font-semibold hover:bg-lime-yellow/90 active:bg-lime-yellow/80 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-colors"
            >
              {isSaving
                ? t('saving')
                : hasPendingPredictions
                ? pendingPredictions.size === 1
                  ? t('savePrediction', { count: pendingPredictions.size })
                  : t('savePredictions', { count: pendingPredictions.size })
                : t('noChangesToSave')}
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
