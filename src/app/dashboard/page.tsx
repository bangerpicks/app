'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { getUserDisplayName, hasSeenOnboardingIntro } from '@/lib/users'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { OnboardingIntro } from '@/components/dashboard/OnboardingIntro'
import { AppShell } from '@/components/dashboard/AppShell'
import { GameweekData } from '@/types/dashboard'
import { getAllGameweeks, AdminGameweekData } from '@/lib/admin'
import {
  mapAdminGameweekToDashboardStatus,
  resolvePlayerCountFromGameweek,
  getEffectiveDeadline,
  LoadBudget,
} from '@/lib/gameweek-selection'
import { FirestoreServedFromCacheError } from '@/lib/firestore-server-read'
import {
  shouldShowDashboardStaleBanner,
  staleBannerShowsRetry,
} from '@/lib/dashboard-load-state'

function convertGameweekData(adminGameweek: AdminGameweekData): GameweekData {
  const lock = getEffectiveDeadline(adminGameweek)
  return {
    gameweekId: adminGameweek.gameweekId,
    name: adminGameweek.name,
    playerCount: resolvePlayerCountFromGameweek(adminGameweek) ?? 0,
    status: mapAdminGameweekToDashboardStatus(adminGameweek),
    deadline: lock?.toDate(),
    startDate: adminGameweek.startDate?.toDate(),
    endDate: adminGameweek.endDate?.toDate(),
    forceOpenForTesting: adminGameweek.forceOpenForTesting,
  }
}

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
      getUserDisplayName(user)
        .then((displayName) => {
          if (abortController.signal.aborted) return
          setUsername(displayName)
        })
        .catch(() => {
          if (abortController.signal.aborted) return
          setUsername(user.displayName || undefined)
        })

      const needsDisplayName = !user.displayName || user.displayName.trim() === 'Player'

      hasSeenOnboardingIntro(user)
        .then((hasSeen) => {
          if (abortController.signal.aborted) return
          if (!hasSeen || needsDisplayName) {
            setShowOnboarding(true)
          }
        })
        .catch(() => {
          if (abortController.signal.aborted) return
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
    }

    async function fetchAvailableGameweeks() {
      try {
        setLoadingGameweeks(true)
        setError(null)
        setRefreshFailed(false)
        setServedFromFirestoreCache(false)

        // 1. Fetch active gameweeks (any tournaments or league weeks)
        let rawGameweeks = await getAllGameweeks(
          {
            status: 'active',
            sortBy: 'date',
            sortOrder: 'desc',
          },
          readOpts
        )

        // 2. Fallback to completed/archived if no active gameweeks
        if (rawGameweeks.length === 0) {
          rawGameweeks = await getAllGameweeks(
            {
              status: 'completed',
              sortBy: 'date',
              sortOrder: 'desc',
            },
            readOpts
          )
        }

        if (abortController.signal.aborted) return

        const mapped = rawGameweeks.map(convertGameweekData)
        setGameweeks(mapped)
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
  }, [loadGeneration])

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

  if (error && gameweeks.length === 0) {
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
        username={username}
      />
      {onboardingLayer}
    </>
  )
}
