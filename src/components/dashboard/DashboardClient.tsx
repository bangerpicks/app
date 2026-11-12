'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { User } from 'firebase/auth'
import { useAuth } from '@/lib/AuthProvider'
import { ensureUserDocument } from '@/lib/users'
import { savePredictions } from '@/lib/predictions'
import {
  clearPendingPicksSession,
  consumeSaveAfterSignInIntent,
  loadPendingPicksFromSession,
  savePendingPicksToSession,
  setSaveAfterSignInIntent,
} from '@/lib/pending-picks-storage'
import { Header } from './Header'
import { IntroSection } from './IntroSection'
import { GameweekCard } from './GameweekCard'
import { MatchCard } from './MatchCard'
import { BottomNavigation } from './BottomNavigation'
import { SignInModal } from './SignInModal'
import { GameweekData, MatchCardData, Prediction } from '@/types/dashboard'
import { GafferDisplayPrefsProvider } from '@/lib/gaffer-display-prefs'
import { useCrowdPickStats } from '@/hooks/useCrowdPickStats'

interface DashboardClientProps {
  gameweek: GameweekData
  playerCount: number
  matches: MatchCardData[]
  username?: string
  /** Gameweek exists but fixtures are still loading or missing */
  fixturesPending?: boolean
}

export function DashboardClient({
  gameweek,
  playerCount,
  matches,
  username,
  fixturesPending = false,
}: DashboardClientProps) {
  const { user } = useAuth()
  const t = useTranslations('dashboard')
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(Date.now())
  const scrollVelocity = useRef(0)
  const postSignInSaveStarted = useRef(false)

  const [pendingPredictions, setPendingPredictions] = useState<Map<number, Prediction>>(new Map())
  const [savedPredictions, setSavedPredictions] = useState<Map<number, Prediction>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [crowdStatsRefreshToken, setCrowdStatsRefreshToken] = useState(0)
  const [isSignInOpen, setIsSignInOpen] = useState(false)

  const fixtureIds = useMemo(
    () => matches.map((m) => m.fixtureId),
    [matches]
  )
  const { crowdPercentsByFixture, crowdStatsByFixture, playerCountByFixture } =
    useCrowdPickStats(
    fixtureIds,
    Boolean(user),
    crowdStatsRefreshToken
  )

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
    const saved = new Map<number, Prediction>()
    matches.forEach((match) => {
      if (match.userPrediction) {
        saved.set(match.fixtureId, match.userPrediction)
      }
    })
    setSavedPredictions(saved)
  }, [matches])

  useEffect(() => {
    postSignInSaveStarted.current = false
  }, [gameweek.gameweekId])

  useEffect(() => {
    if (matches.length === 0) return
    const stored = loadPendingPicksFromSession(gameweek.gameweekId)
    if (!stored) return
    setPendingPredictions((prev) => {
      if (prev.size > 0) return prev
      return stored
    })
  }, [gameweek.gameweekId, matches.length])

  useEffect(() => {
    if (user || matches.length === 0) return
    if (pendingPredictions.size === 0) return
    savePendingPicksToSession(gameweek.gameweekId, pendingPredictions)
  }, [pendingPredictions, user, gameweek.gameweekId, matches.length])

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

  const getDisplayPrediction = (fixtureId: number): Prediction | null => {
    if (pendingPredictions.has(fixtureId)) {
      return pendingPredictions.get(fixtureId) || null
    }
    return savedPredictions.get(fixtureId) || null
  }

  const missingPickCount = matches.filter((m) => getDisplayPrediction(m.fixtureId) == null).length
  const allPicksMade = matches.length > 0 && missingPickCount === 0

  const buildCompletePredictions = useCallback((): Map<number, Prediction> => {
    const complete = new Map<number, Prediction>()
    for (const match of matches) {
      const pick = pendingPredictions.has(match.fixtureId)
        ? pendingPredictions.get(match.fixtureId)
        : savedPredictions.get(match.fixtureId)
      if (pick) {
        complete.set(match.fixtureId, pick)
      }
    }
    return complete
  }, [matches, pendingPredictions, savedPredictions])

  const performSave = useCallback(
    async (authUser: User, completePredictions: Map<number, Prediction>) => {
      if (isDisabled || isSaving) return

      if (gameweek.status !== 'OPEN') {
        setSaveError(t('gameweekClosed'))
        return
      }

      if (completePredictions.size !== matches.length) {
        setSaveError(t('saveRequiresAllPicks'))
        return
      }

      setIsSaving(true)
      setSaveError(null)
      setSaveSuccess(false)

      try {
        await ensureUserDocument(authUser, username || authUser.displayName || 'Player')
        await savePredictions(authUser.uid, completePredictions, matches, gameweek.gameweekId)

        setSavedPredictions((prev) => {
          const next = new Map(prev)
          completePredictions.forEach((prediction, fixtureId) => {
            next.set(fixtureId, prediction)
          })
          return next
        })

        setPendingPredictions(new Map())
        clearPendingPicksSession(gameweek.gameweekId)
        setSaveSuccess(true)
        setCrowdStatsRefreshToken((n) => n + 1)

        setTimeout(() => {
          setSaveSuccess(false)
        }, 3000)
      } catch (error: unknown) {
        console.error('Error saving predictions:', error)
        const message = error instanceof Error ? error.message : null
        setSaveError(message || 'Failed to save predictions. Please try again.')
        postSignInSaveStarted.current = false
      } finally {
        setIsSaving(false)
      }
    },
    [gameweek.gameweekId, gameweek.status, isDisabled, isSaving, matches, t, username]
  )

  useEffect(() => {
    if (!user || isDisabled || matches.length === 0) return
    if (postSignInSaveStarted.current) return

    const shouldSaveAfterSignIn = consumeSaveAfterSignInIntent(gameweek.gameweekId)
    const stored = loadPendingPicksFromSession(gameweek.gameweekId)

    if (stored && stored.size > 0) {
      setPendingPredictions(stored)
    }

    if (!shouldSaveAfterSignIn || !stored) return

    const slateComplete = matches.every((m) => stored.has(m.fixtureId))
    if (!slateComplete) return

    postSignInSaveStarted.current = true
    void performSave(user, stored)
  }, [user, isDisabled, matches, gameweek.gameweekId, performSave])

  const handleSubmit = async () => {
    if (!user) return
    if (isDisabled || isSaving) return

    if (pendingPredictions.size === 0) {
      return
    }

    if (!allPicksMade) {
      setSaveError(t('saveRequiresAllPicks'))
      return
    }

    await performSave(user, buildCompletePredictions())
  }

  const handleGuestSave = () => {
    if (user || isDisabled || isSaving) return

    if (!allPicksMade) {
      setSaveError(t('saveRequiresAllPicks'))
      return
    }

    const complete = buildCompletePredictions()
    savePendingPicksToSession(gameweek.gameweekId, complete)
    setSaveAfterSignInIntent(gameweek.gameweekId)
    setSaveError(null)
    setIsSignInOpen(true)
  }

  const hasPendingPredictions = pendingPredictions.size > 0
  const hasAnyPicks = matches.some((m) => getDisplayPrediction(m.fixtureId) != null)
  const canSaveSignedIn = hasPendingPredictions && allPicksMade && !isSaving
  const canSaveGuest = allPicksMade && !isSaving

  const saveButtonLabel = () => {
    if (isSaving) return t('saving')
    if (!user) {
      if (!allPicksMade) {
        return t('picksRemainingToSave', { count: missingPickCount })
      }
      return t('signInToSavePicks')
    }
    if (hasPendingPredictions && !allPicksMade) {
      return t('picksRemainingToSave', { count: missingPickCount })
    }
    if (hasPendingPredictions) {
      return pendingPredictions.size === 1
        ? t('savePrediction', { count: pendingPredictions.size })
        : t('savePredictions', { count: pendingPredictions.size })
    }
    return t('noChangesToSave')
  }

  return (
    <div ref={containerRef} className="min-h-[100dvh] min-h-screen bg-midnight-violet flex flex-col">
      <Header username={username} />

      <main className="flex-1 px-4 sm:px-5 py-2.5 pb-bottom-nav flex flex-col items-center gap-5 overflow-x-hidden">
        <IntroSection />

        <GameweekCard gameweek={gameweek} playerCount={playerCount} hasAnyPicks={hasAnyPicks} />

        <GafferDisplayPrefsProvider>
          <div className="w-full flex flex-col gap-5">
            {fixturesPending && (
              <p className="text-ivory/80 text-sm text-center py-6">{t('fixturesLoading')}</p>
            )}
            {matches.map((match) => (
              <MatchCard
                key={match.fixtureId}
                match={match}
                userPrediction={getDisplayPrediction(match.fixtureId)}
                onPredictionSelect={handlePredictionSelect}
                disabled={isDisabled || isSaving}
                crowdPickStats={crowdStatsByFixture.get(match.fixtureId)}
                crowdPickPercents={crowdPercentsByFixture.get(match.fixtureId)}
                crowdPickCount={playerCountByFixture.get(match.fixtureId) ?? 0}
              />
            ))}
          </div>
        </GafferDisplayPrefsProvider>

        {!isDisabled && matches.length > 0 && (
          <div className="w-full flex flex-col gap-3 max-w-md">
            {saveError && (
              <div className="bg-cinnabar/20 border border-cinnabar/40 rounded-lg px-4 py-3 text-cinnabar text-sm">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div className="bg-lime-yellow/20 border border-lime-yellow/40 rounded-lg px-4 py-3 text-lime-yellow text-sm">
                {t('savedSuccessfully')}
              </div>
            )}

            {!allPicksMade && (
              <p className="text-center text-sm text-amber-glow">
                {t('picksRemainingToSave', { count: missingPickCount })}
              </p>
            )}

            {!user && allPicksMade && (
              <p className="text-center text-sm text-ivory/80">{t('guestSaveHint')}</p>
            )}

            <button
              type="button"
              onClick={user ? handleSubmit : handleGuestSave}
              disabled={user ? !canSaveSignedIn : !canSaveGuest}
              className="w-full bg-lime-yellow text-midnight-violet py-3 px-4 rounded-lg font-semibold hover:bg-lime-yellow/90 active:bg-lime-yellow/80 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-colors"
            >
              {saveButtonLabel()}
            </button>
          </div>
        )}
      </main>

      <BottomNavigation />
      <SignInModal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />
    </div>
  )
}
