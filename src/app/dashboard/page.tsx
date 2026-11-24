'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { loadUserDocument } from '@/lib/users'
import { needsCustomDisplayNamePrompt } from '@/lib/display-name-claim.mjs'
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
import { subscribeHomeCatalogChanges } from '@/lib/home-live-refresh'
import {
  loadHomeStaleWhileRevalidate,
  shouldRefetchHomeOnResume,
} from '@/lib/home-revalidate.mjs'
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
      loadUserDocument(user)
        .then((profile) => {
          if (abortController.signal.aborted) return
          const profileName = profile?.displayName || user.displayName || undefined
          setUsername(profileName)
          const needsDisplayName = needsCustomDisplayNamePrompt(
            user.displayName,
            profile?.displayName
          )
          const hasSeen = profile?.hasSeenOnboardingIntro === true
          if (!hasSeen || needsDisplayName) {
            setShowOnboarding(true)
          }
        })
        .catch(() => {
          if (abortController.signal.aborted) return
          setUsername(user.displayName || undefined)
          if (needsCustomDisplayNamePrompt(user.displayName, undefined)) {
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

  /** Bumped by live listeners / foreground resume: silent server refresh, no loading screen. */
  const [backgroundRefreshKey, setBackgroundRefreshKey] = useState(0)
  const lastServerLoadAtRef = useRef(0)
  const loadInFlightRef = useRef(false)
  const hasRenderedDataRef = useRef(false)

  useEffect(() => {
    const abortController = new AbortController()
    const isCancelled = () => abortController.signal.aborted

    type HomeLoad = Awaited<ReturnType<typeof loadHomeCompetitionPlayCards>>

    const runLoad = async (staleWhileRevalidate: boolean) => {
      const servedFromCacheRef = { current: false }
      const data = await loadHomeCompetitionPlayCards(user?.uid ?? null, {
        serverPreferring: true,
        budget: new LoadBudget(),
        servedFromCacheRef,
        staleWhileRevalidate,
        maxRetries: staleWhileRevalidate ? 0 : undefined,
      })
      return { data, servedFromCache: servedFromCacheRef.current }
    }

    const apply = (data: HomeLoad, meta: { stale: boolean }) => {
      setCompetitionCards(data.cards)
      setComingSoonCompetitions(data.comingSoon)
      setGameweeksById(data.gameweeksById)
      setGameweeks([...data.gameweeksById.values()])
      setError(null)
      setServedFromFirestoreCache(meta.stale)
      setRefreshFailed(meta.stale)
      setLoadingGameweeks(false)
      hasRenderedDataRef.current = true
    }

    async function fetchAvailableGameweeks() {
      if (authLoading) return
      // Background refreshes keep the current cards on screen; only the first load shows Loading.
      const silent = backgroundRefreshKey > 0 && hasRenderedDataRef.current
      loadInFlightRef.current = true
      try {
        if (!silent) {
          setLoadingGameweeks(true)
          setError(null)
          setRefreshFailed(false)
          setServedFromFirestoreCache(false)
        }

        if (silent) {
          // Background refresh: straight to the server, keep current cards until it lands.
          const fresh = await runLoad(false)
          if (isCancelled()) return
          apply(fresh.data, { stale: fresh.servedFromCache })
          if (!fresh.servedFromCache) lastServerLoadAtRef.current = Date.now()
          return
        }

        // First paint from IndexedDB (fast), then always confirm with the server.
        const { serverConfirmed } = await loadHomeStaleWhileRevalidate<HomeLoad>({
          loadCacheFirst: () => runLoad(true),
          loadServer: () => runLoad(false),
          apply,
          isCancelled,
        })
        if (serverConfirmed) lastServerLoadAtRef.current = Date.now()
      } catch (err: unknown) {
        if (isCancelled()) return
        console.error('Error fetching dashboard gameweeks:', err)
        if (silent) {
          // Keep what is on screen; flag it as not refreshed.
          setServedFromFirestoreCache(true)
          setRefreshFailed(true)
          return
        }
        const message = err instanceof Error ? err.message : 'Failed to load competitions'
        const cacheOnly = err instanceof FirestoreServedFromCacheError
        setError(message)
        setServedFromFirestoreCache(cacheOnly)
        setRefreshFailed(true)
      } finally {
        loadInFlightRef.current = false
        if (!isCancelled()) {
          setLoadingGameweeks(false)
        }
      }
    }

    fetchAvailableGameweeks()

    return () => {
      abortController.abort()
      loadInFlightRef.current = false
    }
  }, [loadGeneration, backgroundRefreshKey, user?.uid, authLoading])

  const requestBackgroundRefresh = useCallback(() => {
    setBackgroundRefreshKey((k) => k + 1)
  }, [])

  // Live: a publish, close-out, or activeGameweekId change re-runs the server load.
  useEffect(() => {
    if (authLoading) return
    return subscribeHomeCatalogChanges(requestBackgroundRefresh)
  }, [authLoading, user?.uid, requestBackgroundRefresh])

  // Foreground: returning to the tab / app refetches (throttled).
  useEffect(() => {
    const onResume = () => {
      const visible =
        typeof document === 'undefined' || document.visibilityState !== 'hidden'
      if (
        shouldRefetchHomeOnResume({
          visible,
          inFlight: loadInFlightRef.current,
          lastServerLoadAtMs: lastServerLoadAtRef.current,
        })
      ) {
        requestBackgroundRefresh()
      }
    }
    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('focus', onResume)
    window.addEventListener('pageshow', onResume)
    return () => {
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('focus', onResume)
      window.removeEventListener('pageshow', onResume)
    }
  }, [requestBackgroundRefresh])

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
    user && needsCustomDisplayNamePrompt(user.displayName, username)
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