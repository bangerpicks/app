'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { loadUserDocument } from '@/lib/users'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import dynamic from 'next/dynamic'

const OnboardingIntro = dynamic(
  () => import('@/components/dashboard/OnboardingIntro').then((m) => ({ default: m.OnboardingIntro })),
  { ssr: false }
)
import { AppShell } from '@/components/dashboard/AppShell'
import { GameweekData } from '@/types/dashboard'
import { LoadBudget } from '@/lib/gameweek-selection'
import { loadHomeCompetitionPlayCards } from '@/lib/competitions'
import type { CompetitionDocument, CompetitionPlayCard } from '@/types/competition'
import { FirestoreServedFromCacheError } from '@/lib/firestore-server-read'
import {
  shouldShowDashboardStaleBanner,
  staleBannerShowsRetry,
} from '@/lib/dashboard-load-state'

function DashboardShell({
  children,
  username,
}: {
  children: React.ReactNode
  username?: string
}) {
  return (
    <AppShell
      username={username}
      mainClassName="flex-1 px-4 sm:px-5 py-8 pb-bottom-nav flex flex-col items-center justify-center gap-4 text-center overflow-x-hidden"
    >
      {children}
    </AppShell>
  )
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const t = useTranslations('dashboard')
  const [username, setUsername] = useState<string | undefined>(undefined)
  const [gameweeks, setGameweeks] = useState<GameweekData[]>([])
  const [competitionCards, setCompetitionCards] = useState<CompetitionPlayCard[]>([])
  const [comingSoonCompetitions, setComingSoonCompetitions] = useState<CompetitionDocument[]>([])
  const [gameweeksById, setGameweeksById] = useState<Map<string, GameweekData>>(new Map())
  const [loadingGameweeks, setLoadingGameweeks] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [devPreviewDismissed, setDevPreviewDismissed] = useState(false)
  const [loadGeneration, setLoadGeneration] = useState(0)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const [servedFromFirestoreCache, setServedFromFirestoreCache] = useState(false)

  const isDevOnboardingPreview =
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEV_SHOW_ONBOARDING === 'true'
  const isDevNameStep =
    isDevOnboardingPreview &&
    process.env.NEXT_PUBLIC_DEV_ONBOARDING_NAME_STEP === 'true'

  useEffect(() => {
    const abortController = new AbortController()

    if (user) {
      const needsDisplayName =
        !user.displayName || user.displayName.trim() === 'Player'

      loadUserDocument(user)
        .then((profile) => {
          if (abortController.signal.aborted) return
          setUsername(
            profile?.displayName || user.displayName || undefined
          )
          const hasSeen = profile?.hasSeenOnboardingIntro === true
          if (!hasSeen || needsDisplayName) {
            setShowOnboarding(true)
          }
        })
        .catch(() => {
          if (abortController.signal.aborted) return
          setUsername(user.displayName || undefined)
          if (needsDisplayName) {
            setShowOnboarding(true)
          }
        })
    } else {
      setUsername(undefined)
      setShowOnboarding(false)
    }

    return () => {
      abortController.abort()
    }
  }, [user])

  useEffect(() => {
    const abortController = new AbortController()
    const loadBudget = new LoadBudget()
    const servedFromCacheRef = { current: false }
    const readOpts = {
      serverPreferring: true as const,
      budget: loadBudget,
      servedFromCacheRef,
      staleWhileRevalidate: true as const,
    }

    async function fetchAvailableGameweeks() {
      if (authLoading) return
      try {
        setLoadingGameweeks(true)
        setError(null)
        setRefreshFailed(false)
        setServedFromFirestoreCache(false)

        const { cards, comingSoon, gameweeksById: byId } = await loadHomeCompetitionPlayCards(
          user?.uid ?? null,
          readOpts
        )

        if (abortController.signal.aborted) return

        setCompetitionCards(cards)
        setComingSoonCompetitions(comingSoon)
        setGameweeksById(byId)
        setGameweeks([...byId.values()])
        const staleLoad = servedFromCacheRef.current
        setServedFromFirestoreCache(staleLoad)
        setRefreshFailed(staleLoad)
      } catch (err: unknown) {
        if (abortController.signal.aborted) return
        console.error('Error fetching dashboard gameweeks:', err)
        const message = err instanceof Error ? err.message : 'Failed to load competitions'
        const cacheOnly = err instanceof FirestoreServedFromCacheError
        setError(message)
        setServedFromFirestoreCache(cacheOnly)
        setRefreshFailed(true)
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingGameweeks(false)
        }
      }
    }

    fetchAvailableGameweeks()

    return () => {
      abortController.abort()
    }
  }, [loadGeneration, user?.uid, authLoading])

  const retryGameweekLoad = () => {
    setError(null)
    setRefreshFailed(false)
    setServedFromFirestoreCache(false)
    setLoadGeneration((g) => g + 1)
  }

  const showStaleBanner = shouldShowDashboardStaleBanner({
    servedFromFirestoreCache,
    refreshFailed,
    usingSessionCache: false,
    isRefreshingGameweek: false,
  })
  const showStaleRetry = staleBannerShowsRetry({
    servedFromFirestoreCache,
    refreshFailed,
  })

  const onboardingOpen =
    showOnboarding || (isDevOnboardingPreview && !devPreviewDismissed)
  const needsDisplayName = Boolean(
    user && (!user.displayName || user.displayName.trim() === 'Player')
  )
  const closeOnboarding = () => {
    setShowOnboarding(false)
    if (isDevOnboardingPreview) {
      setDevPreviewDismissed(true)
    }
  }

  const onboardingLayer = (
    <OnboardingIntro
      isOpen={onboardingOpen}
      onClose={closeOnboarding}
      previewOnly={isDevOnboardingPreview && !devPreviewDismissed}
      requiresDisplayName={
        isDevOnboardingPreview && !devPreviewDismissed ? isDevNameStep : needsDisplayName
      }
    />
  )

  if (authLoading || loadingGameweeks) {
    return (
      <>
        <DashboardShell username={username}>
          <p className="text-ivory">{t('loading')}</p>
        </DashboardShell>
        {onboardingLayer}
      </>
    )
  }

  if (error && gameweeks.length === 0 && competitionCards.length === 0) {
    return (
      <>
        <DashboardShell username={username}>
          <p className="text-cinnabar">{t('loadError')}</p>
          <p className="text-ivory/70 text-sm">{error}</p>
          <button
            type="button"
            onClick={retryGameweekLoad}
            className="mt-2 bg-lime-yellow text-midnight-violet py-3 px-6 rounded-lg font-semibold hover:bg-opacity-90 transition-colors active:bg-opacity-80"
          >
            {t('loadErrorRetry')}
          </button>
        </DashboardShell>
        {onboardingLayer}
      </>
    )
  }

  return (
    <>
      {showStaleBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 bg-midnight-violet/95 border-b border-ivory/15 text-center text-sm">
          <p className="text-ivory/80">
            {showStaleRetry ? t('staleDataNotice') : t('refreshingGameweek')}
          </p>
          {showStaleRetry && (
            <button
              type="button"
              onClick={retryGameweekLoad}
              className="mt-1 text-lime-yellow font-semibold underline underline-offset-2"
            >
              {t('loadErrorRetry')}
            </button>
          )}
        </div>
      )}
      <DashboardClient
        gameweeks={gameweeks}
        competitionCards={competitionCards}
        gameweeksById={gameweeksById}
        comingSoonCompetitions={comingSoonCompetitions}
        username={username}
      />
      {onboardingLayer}
    </>
  )
}