'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { hasSeenOnboardingIntro } from '@/lib/users'
import { useUserProfile } from '@/lib/UserProfileProvider'
import { getUserPredictionsForGameweek, readGameweekPlayerCount } from '@/lib/predictions'
import {
  mergePlayerCountDisplay,
  shouldSkipGameweekPlayerCountRefetch,
} from '@/lib/player-count-display.mjs'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { OnboardingIntro } from '@/components/dashboard/OnboardingIntro'
import { AppShell } from '@/components/dashboard/AppShell'
import { GameweekData, MatchCardData, FormResult } from '@/types/dashboard'
import { getGameweekFixtures, AdminGameweekData, GameweekFixtureData } from '@/lib/admin'
import { useLiveMatches } from '@/lib/useLiveMatches'
import { useLanguage } from '@/lib/LanguageProvider'
import { formatMatchKickoffTime } from '@/lib/locale-format'
import {
  mapApiFootballStatusToMatchStatus,
  venueFromApiFootball,
} from '@/lib/match-card-display'
import { marketOddsFromFirestoreData } from '@/lib/market-odds-firestore'
import type { Locale } from '@/i18n/config'
import {
  fetchCurrentGameweek,
  mapAdminGameweekToDashboardStatus,
  resolvePlayerCountFromGameweek,
  getEffectiveDeadline,
  LoadBudget,
} from '@/lib/gameweek-selection'
import {
  readDashboardSessionCache,
  writeDashboardSessionCache,
} from '@/lib/dashboard-cache'
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
    startDate: adminGameweek.startDate.toDate(),
    endDate: adminGameweek.endDate.toDate(),
    forceOpenForTesting: adminGameweek.forceOpenForTesting,
  }
}

function convertFormString(formString: string): FormResult[] {
  if (!formString) return []
  return formString
    .slice(-5)
    .split('')
    .filter((char): char is FormResult => char === 'W' || char === 'D' || char === 'L')
}

function convertFixtureToMatchCard(
  fixtureData: GameweekFixtureData,
  teamPositions: Map<number, number> = new Map(),
  teamForms: Map<number, FormResult[]> = new Map(),
  locale: Locale = 'en'
): MatchCardData {
  const fixture = fixtureData.fixture.fixture
  const fixtureDate = new Date(fixture.date)

  const matchStatus = mapApiFootballStatusToMatchStatus(fixture.status.short)

  const score =
    fixtureData.fixture.goals.home !== null && fixtureData.fixture.goals.away !== null
      ? {
          home: fixtureData.fixture.goals.home,
          away: fixtureData.fixture.goals.away,
        }
      : undefined

  const minute = fixture.status.elapsed ?? undefined

  return {
    fixtureId: fixtureData.fixtureId,
    league: {
      id: fixtureData.league.id,
      name: fixtureData.league.name,
      logo: fixtureData.league.logo,
    },
    venue: venueFromApiFootball(fixture.venue),
    date: fixtureDate,
    time: formatMatchKickoffTime(fixtureDate, locale),
    homeTeam: {
      id: fixtureData.teams.home.id,
      name: fixtureData.teams.home.name,
      logo: fixtureData.teams.home.logo,
      position: teamPositions.get(fixtureData.teams.home.id),
      form: teamForms.get(fixtureData.teams.home.id) || [],
    },
    awayTeam: {
      id: fixtureData.teams.away.id,
      name: fixtureData.teams.away.name,
      logo: fixtureData.teams.away.logo,
      position: teamPositions.get(fixtureData.teams.away.id),
      form: teamForms.get(fixtureData.teams.away.id) || [],
    },
    matchStatus,
    minute,
    score,
    whyItMatters: fixtureData.whyItMatters,
    whyItMatters_esMX: fixtureData.whyItMatters_esMX,
    officialPick: fixtureData.officialPick,
    officialConfidence: fixtureData.officialConfidence,
    marketOdds: marketOddsFromFirestoreData(fixtureData.marketOdds),
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
  const { profileDisplayName, hasValidProfileName } = useUserProfile()
  const { locale } = useLanguage()
  const t = useTranslations('dashboard')
  const [username, setUsername] = useState<string | undefined>(undefined)
  const [gameweek, setGameweek] = useState<GameweekData | null>(null)
  const [initialMatches, setInitialMatches] = useState<MatchCardData[]>([])
  const [gameweekId, setGameweekId] = useState<string | null>(null)
  const [loadingGameweek, setLoadingGameweek] = useState(true)
  const [loadingPredictions, setLoadingPredictions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [devPreviewDismissed, setDevPreviewDismissed] = useState(false)
  const [emptyReason, setEmptyReason] = useState<'none' | 'no-week' | 'no-fixtures' | null>(null)
  const [loadGeneration, setLoadGeneration] = useState(0)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const [usingSessionCache, setUsingSessionCache] = useState(false)
  const [isRefreshingGameweek, setIsRefreshingGameweek] = useState(false)
  const [servedFromFirestoreCache, setServedFromFirestoreCache] = useState(false)

  const cacheUid = user?.uid ?? null

  const isDevOnboardingPreview =
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEV_SHOW_ONBOARDING === 'true'
  const isDevNameStep =
    isDevOnboardingPreview &&
    process.env.NEXT_PUBLIC_DEV_ONBOARDING_NAME_STEP === 'true'

  useEffect(() => {
    const abortController = new AbortController()

    if (user) {
      hasSeenOnboardingIntro(user)
        .then((hasSeen) => {
          if (abortController.signal.aborted) return
          if (!hasSeen) {
            setShowOnboarding(true)
          }
        })
        .catch(() => {
          if (abortController.signal.aborted) return
          setShowOnboarding(true)
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
    if (hasValidProfileName && profileDisplayName) {
      setUsername(profileDisplayName)
    } else {
      setUsername(undefined)
    }
  }, [hasValidProfileName, profileDisplayName])

  useEffect(() => {
    const abortController = new AbortController()
    const sessionCache = readDashboardSessionCache(cacheUid, locale)
    const hadCache = Boolean(sessionCache)
    const loadBudget = new LoadBudget()
    const servedFromCacheRef = { current: false }
    const fixtureReadOpts = {
      serverPreferring: true as const,
      budget: loadBudget,
      servedFromCacheRef,
    }

    if (hadCache && sessionCache) {
      setGameweek(sessionCache.gameweek)
      setInitialMatches(sessionCache.matches)
      setGameweekId(sessionCache.gameweekId)
      setUsingSessionCache(true)
      setLoadingGameweek(false)
    }

    async function fetchActiveGameweek() {
      try {
        if (!hadCache) {
          setLoadingGameweek(true)
          setError(null)
          setEmptyReason(null)
          setGameweek(null)
          setInitialMatches([])
          setGameweekId(null)
        } else {
          setRefreshFailed(false)
          setServedFromFirestoreCache(false)
          setIsRefreshingGameweek(true)
        }

        servedFromCacheRef.current = false
        const currentGameweek = await fetchCurrentGameweek(loadBudget, servedFromCacheRef)

        if (abortController.signal.aborted) return

        if (!currentGameweek) {
          setEmptyReason('no-week')
          setServedFromFirestoreCache(false)
          setRefreshFailed(false)
          return
        }

        const fixtures = await getGameweekFixtures(
          currentGameweek.gameweekId,
          fixtureReadOpts
        )

        if (abortController.signal.aborted) return

        if (fixtures.length === 0) {
          setGameweek(convertGameweekData(currentGameweek))
          setGameweekId(currentGameweek.gameweekId)
          setEmptyReason('no-fixtures')
          return
        }

        const teamPositions = new Map<number, number>()
        const teamForms = new Map<number, FormResult[]>()

        if (currentGameweek.standings) {
          Object.entries(currentGameweek.standings).forEach(([, standings]) => {
            if (!Array.isArray(standings)) {
              return
            }
            standings.forEach((team) => {
              if (team?.team && typeof team.team.id === 'number') {
                teamPositions.set(team.team.id, team.rank)
                teamForms.set(team.team.id, convertFormString(team.form || ''))
              }
            })
          })
        }

        const sortedMatches = fixtures
          .map((fixture) =>
            convertFixtureToMatchCard(fixture, teamPositions, teamForms, locale)
          )
          .sort((a, b) => a.date.getTime() - b.date.getTime())

        if (abortController.signal.aborted) return

        const dashboardGameweek = convertGameweekData(currentGameweek)
        setGameweekId(currentGameweek.gameweekId)
        setGameweek(dashboardGameweek)
        setInitialMatches(sortedMatches)
        const staleFirestoreLoad = servedFromCacheRef.current
        setUsingSessionCache(false)
        setRefreshFailed(staleFirestoreLoad)
        setServedFromFirestoreCache(staleFirestoreLoad)
        setIsRefreshingGameweek(false)
        setError(null)
        setEmptyReason(null)
        writeDashboardSessionCache(cacheUid, locale, {
          gameweekId: currentGameweek.gameweekId,
          gameweek: dashboardGameweek,
          matches: sortedMatches,
        })

        const storedCount = resolvePlayerCountFromGameweek(currentGameweek)
        if (
          !shouldSkipGameweekPlayerCountRefetch(storedCount) &&
          currentGameweek.fixtureIds &&
          currentGameweek.fixtureIds.length > 0
        ) {
          readGameweekPlayerCount(currentGameweek.fixtureIds, currentGameweek.gameweekId)
            .then(({ count, servedFromCache }) => {
              if (abortController.signal.aborted) return
              setGameweek((prev) =>
                prev
                  ? {
                      ...prev,
                      playerCount: mergePlayerCountDisplay(
                        prev.playerCount,
                        count,
                        servedFromCache
                      ),
                    }
                  : null
              )
            })
            .catch(() => {
              /* leave count unchanged */
            })
        }

        if (user) {
          setLoadingPredictions(true)
          try {
            const fixtureIds = sortedMatches.map((match) => match.fixtureId)
            const predictionRead = await getUserPredictionsForGameweek(
              user.uid,
              currentGameweek.gameweekId,
              fixtureIds
            )

            if (abortController.signal.aborted) return

            if (predictionRead.servedFromCache) {
              servedFromCacheRef.current = true
              setServedFromFirestoreCache(true)
              setRefreshFailed(true)
            }

            setInitialMatches((prevMatches) =>
              prevMatches.map((match) => ({
                ...match,
                userPrediction: predictionRead.predictions.get(match.fixtureId) || null,
              }))
            )
          } catch {
            /* predictions optional */
          } finally {
            if (!abortController.signal.aborted) {
              setLoadingPredictions(false)
            }
          }
        }
      } catch (err: unknown) {
        if (abortController.signal.aborted) return
        console.error('Error fetching active gameweek:', err)
        const message = err instanceof Error ? err.message : 'Failed to load gameweek data'
        const cacheOnly = err instanceof FirestoreServedFromCacheError
        if (hadCache) {
          setRefreshFailed(true)
          setServedFromFirestoreCache(cacheOnly)
          setError(message)
          setEmptyReason(null)
        } else {
          setError(message)
          setGameweek(null)
          setInitialMatches([])
          setGameweekId(null)
          setEmptyReason(null)
          setServedFromFirestoreCache(cacheOnly)
        }
        setLoadingPredictions(false)
        if (hadCache) {
          setIsRefreshingGameweek(false)
        }
      } finally {
        // Always leave the loading gate when this attempt finishes (success, error, or empty).
        // Aborted runs skip this so a newer effect owns the flag.
        if (!abortController.signal.aborted) {
          setLoadingGameweek(false)
        }
      }
    }

    fetchActiveGameweek()

    return () => {
      abortController.abort()
    }
  }, [user, loadGeneration, locale, cacheUid])

  const retryGameweekLoad = () => {
    setError(null)
    setRefreshFailed(false)
    setServedFromFirestoreCache(false)
    setEmptyReason(null)
    setLoadGeneration((g) => g + 1)
  }

  const showStaleBanner = shouldShowDashboardStaleBanner({
    servedFromFirestoreCache,
    refreshFailed,
    usingSessionCache,
    isRefreshingGameweek,
  })
  const showStaleRetry = staleBannerShowsRetry({
    servedFromFirestoreCache,
    refreshFailed,
  })

  const baseMatches = useMemo(
    () =>
      initialMatches.map((m) => ({
        ...m,
        time: formatMatchKickoffTime(m.date, locale),
      })),
    [initialMatches, locale]
  )
  const liveMatches = useLiveMatches(gameweekId, baseMatches, locale)

  const onboardingOpen =
    showOnboarding || (isDevOnboardingPreview && !devPreviewDismissed)
  const needsDisplayName = false
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

  if (authLoading || loadingGameweek) {
    return (
      <>
        <DashboardShell username={username}>
          <p className="text-ivory">{t('loading')}</p>
        </DashboardShell>
        {onboardingLayer}
      </>
    )
  }

  if (error && !gameweek) {
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

  if (emptyReason === 'no-week') {
    return (
      <>
        <DashboardShell username={username}>
          <p className="text-ivory text-lg font-semibold">{t('noActiveGameweekTitle')}</p>
          <p className="text-ivory/70 text-sm max-w-md">{t('noActiveGameweekBody')}</p>
        </DashboardShell>
        {onboardingLayer}
      </>
    )
  }

  if (!gameweek) {
    return (
      <>
        <DashboardShell username={username}>
          <p className="text-ivory">{t('loadError')}</p>
        </DashboardShell>
        {onboardingLayer}
      </>
    )
  }

  if (emptyReason === 'no-fixtures' || liveMatches.length === 0) {
    return (
      <>
        <DashboardClient
          gameweek={gameweek}
          playerCount={gameweek.playerCount}
          matches={[]}
          username={username}
          fixturesPending
        />
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
        gameweek={gameweek}
        playerCount={gameweek.playerCount}
        matches={liveMatches}
        username={username}
      />
      {onboardingLayer}
    </>
  )
}
