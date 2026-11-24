'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthProvider'
import { getUserDisplayName } from '@/lib/users'
import { getUserPredictionsForGameweek, readGameweekPlayerCount } from '@/lib/predictions'
import {
  mergePlayerCountDisplay,
  shouldSkipGameweekPlayerCountRefetch,
} from '@/lib/player-count-display.mjs'
import { PicksClient } from '@/components/dashboard/PicksClient'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { AppShell } from '@/components/dashboard/AppShell'
import { GameweekData, MatchCardData, FormResult } from '@/types/dashboard'
import {
  getGameweekById,
  getGameweekFixtures,
  AdminGameweekData,
  GameweekFixtureData,
} from '@/lib/admin'
import { useLiveMatches } from '@/lib/useLiveMatches'
import { useLanguage } from '@/lib/LanguageProvider'
import { formatMatchKickoffTime } from '@/lib/locale-format'
import {
  mapApiFootballStatusToMatchStatus,
  venueFromApiFootball,
} from '@/lib/match-card-display'
import { marketOddsFromFirestoreData } from '@/lib/market-odds-firestore'
import type { Locale } from '@/i18n/config'
import { fetchCurrentGameweek, resolvePlayerCountFromGameweek, LoadBudget } from '@/lib/gameweek-selection'
import { convertAdminGameweekToGameweekData } from '@/lib/convert-gameweek-data'
import { resolveCompetitionForAdminGameweek } from '@/lib/competitions'
import type { CompetitionDocument } from '@/types/competition'
import {
  readDashboardSessionCache,
  writeDashboardSessionCache,
} from '@/lib/dashboard-cache'
import { FirestoreServedFromCacheError } from '@/lib/firestore-server-read'
import {
  shouldShowDashboardStaleBanner,
  staleBannerShowsRetry,
} from '@/lib/dashboard-load-state'

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

function PicksPageContent() {
  const searchParams = useSearchParams()
  const requestedGameweekId = searchParams.get('id')

  const { user, loading: authLoading } = useAuth()
  const { locale } = useLanguage()
  const t = useTranslations('dashboard')
  const tPicks = useTranslations('picks')
  const tAuth = useTranslations('auth')

  const [username, setUsername] = useState<string | undefined>(undefined)
  const [gameweek, setGameweek] = useState<GameweekData | null>(null)
  const [competition, setCompetition] = useState<CompetitionDocument | undefined>(undefined)
  const [initialMatches, setInitialMatches] = useState<MatchCardData[]>([])
  const [gameweekId, setGameweekId] = useState<string | null>(null)
  const [loadingGameweek, setLoadingGameweek] = useState(true)
  const [, setLoadingPredictions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emptyReason, setEmptyReason] = useState<'none' | 'no-week' | 'no-fixtures' | null>(null)
  const [loadGeneration, setLoadGeneration] = useState(0)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const [usingSessionCache, setUsingSessionCache] = useState(false)
  const [isRefreshingGameweek, setIsRefreshingGameweek] = useState(false)
  const [servedFromFirestoreCache, setServedFromFirestoreCache] = useState(false)

  const cacheUid = user?.uid ?? null

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
    } else {
      setUsername(undefined)
    }

    return () => {
      abortController.abort()
    }
  }, [user])

  useEffect(() => {
    // If not authenticated, do not fetch fixtures
    if (!user) {
      setLoadingGameweek(false)
      return
    }

    const abortController = new AbortController()
    const sessionCache = readDashboardSessionCache(cacheUid, locale)
    const isMatchingCache =
      sessionCache && (!requestedGameweekId || sessionCache.gameweekId === requestedGameweekId)
    const hadCache = Boolean(isMatchingCache)
    const loadBudget = new LoadBudget()
    const servedFromCacheRef = { current: false }
    const fixtureReadOpts = {
      serverPreferring: true as const,
      budget: loadBudget,
      servedFromCacheRef,
      maxRetries: hadCache ? undefined : 0,
    }

    if (hadCache && sessionCache) {
      setGameweek(sessionCache.gameweek)
      setInitialMatches(sessionCache.matches)
      setGameweekId(sessionCache.gameweekId)
      setCompetition(sessionCache.competition)
      setUsingSessionCache(true)
      setLoadingGameweek(false)
      if (!sessionCache.competition && sessionCache.gameweekId) {
        void getGameweekById(sessionCache.gameweekId).then((gw) => {
          if (gw && !abortController.signal.aborted) {
            void resolveCompetitionForAdminGameweek(gw).then((comp) => {
              if (!abortController.signal.aborted) setCompetition(comp)
            })
          }
        })
      }
    }

    async function fetchGameweekAndFixtures() {
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

        let targetGameweek: AdminGameweekData | null = null

        if (requestedGameweekId) {
          targetGameweek = await getGameweekById(requestedGameweekId)
        } else {
          targetGameweek = await fetchCurrentGameweek(loadBudget, servedFromCacheRef)
        }

        if (abortController.signal.aborted) return

        if (!targetGameweek) {
          setCompetition(undefined)
          setEmptyReason('no-week')
          setServedFromFirestoreCache(false)
          setRefreshFailed(false)
          return
        }

        const linkedCompetition = await resolveCompetitionForAdminGameweek(targetGameweek)
        if (abortController.signal.aborted) return
        setCompetition(linkedCompetition)

        const fixtures = await getGameweekFixtures(
          targetGameweek.gameweekId,
          fixtureReadOpts
        )

        if (abortController.signal.aborted) return

        if (fixtures.length === 0) {
          setGameweek(convertAdminGameweekToGameweekData(targetGameweek))
          setGameweekId(targetGameweek.gameweekId)
          setEmptyReason('no-fixtures')
          return
        }

        const dashboardGameweek = convertAdminGameweekToGameweekData(targetGameweek)
        const sortedMatchesBare = fixtures
          .map((fixture) => convertFixtureToMatchCard(fixture, new Map(), new Map(), locale))
          .sort((a, b) => a.date.getTime() - b.date.getTime())

        if (abortController.signal.aborted) return

        setGameweekId(targetGameweek.gameweekId)
        setGameweek(dashboardGameweek)
        setInitialMatches(sortedMatchesBare)
        const staleFirestoreLoad = servedFromCacheRef.current
        setUsingSessionCache(false)
        setRefreshFailed(staleFirestoreLoad)
        setServedFromFirestoreCache(staleFirestoreLoad)
        setIsRefreshingGameweek(false)
        setError(null)
        setEmptyReason(null)
        setLoadingGameweek(false)

        const teamPositions = new Map<number, number>()
        const teamForms = new Map<number, FormResult[]>()

        const { getGameweekStandings } = await import('@/lib/gameweek-standings')
        const standingsMap =
          (await getGameweekStandings(targetGameweek.gameweekId)) ?? targetGameweek.standings

        if (standingsMap) {
          Object.entries(standingsMap).forEach(([, standings]) => {
            if (!Array.isArray(standings)) return
            standings.forEach((team) => {
              if (team?.team && typeof team.team.id === 'number') {
                teamPositions.set(team.team.id, team.rank)
                teamForms.set(team.team.id, convertFormString(team.form || ''))
              }
            })
          })
        }

        const sortedMatches =
          teamPositions.size > 0 || teamForms.size > 0
            ? fixtures
                .map((fixture) =>
                  convertFixtureToMatchCard(fixture, teamPositions, teamForms, locale)
                )
                .sort((a, b) => a.date.getTime() - b.date.getTime())
            : sortedMatchesBare

        if (abortController.signal.aborted) return

        setInitialMatches(sortedMatches)

        writeDashboardSessionCache(cacheUid, locale, {
          gameweekId: targetGameweek.gameweekId,
          gameweek: dashboardGameweek,
          matches: sortedMatches,
          competition: linkedCompetition,
        })

        const storedCount = resolvePlayerCountFromGameweek(targetGameweek)
        if (
          !shouldSkipGameweekPlayerCountRefetch(storedCount) &&
          targetGameweek.fixtureIds &&
          targetGameweek.fixtureIds.length > 0
        ) {
          readGameweekPlayerCount(targetGameweek.fixtureIds, targetGameweek.gameweekId)
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
            .catch(() => {})
        }

        if (user) {
          setLoadingPredictions(true)
          try {
            const fixtureIds = sortedMatches.map((match) => match.fixtureId)
            const predictionRead = await getUserPredictionsForGameweek(
              user.uid,
              targetGameweek.gameweekId,
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
            // predictions optional
          } finally {
            if (!abortController.signal.aborted) {
              setLoadingPredictions(false)
            }
          }
        }
      } catch (err: unknown) {
        if (abortController.signal.aborted) return
        console.error('Error fetching gameweek fixtures:', err)
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
        if (!abortController.signal.aborted) {
          setLoadingGameweek(false)
        }
      }
    }

    fetchGameweekAndFixtures()

    return () => {
      abortController.abort()
    }
  }, [user, requestedGameweekId, loadGeneration, locale, cacheUid])

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
  const displayMatches = liveMatches.length > 0 ? liveMatches : baseMatches
  const fixturesStillLoading =
    liveMatches.length === 0 && baseMatches.length > 0 && emptyReason !== 'no-fixtures'

  // 1. Auth Loading Gate
  if (authLoading) {
    return (
      <AppShell
        username={username}
        mainClassName="flex-1 px-4 sm:px-5 py-8 pb-bottom-nav flex flex-col items-center justify-center gap-4 text-center overflow-x-hidden"
      >
        <p className="text-ivory">{t('loading')}</p>
      </AppShell>
    )
  }

  // 2. Unauthenticated User Gate
  if (!user) {
    return (
      <NotSignedIn
        title={tAuth('picksSignInRequired')}
        description={tAuth('picksSignInDescription')}
        backHref="/dashboard/"
        backLabel={tPicks('backToDashboard')}
      />
    )
  }

  // 3. Loading Gameweek Fixtures
  if (loadingGameweek) {
    return (
      <AppShell
        username={username}
        mainClassName="flex-1 px-4 sm:px-5 py-8 pb-bottom-nav flex flex-col items-center justify-center gap-4 text-center overflow-x-hidden"
      >
        <p className="text-ivory">{t('loading')}</p>
      </AppShell>
    )
  }

  // 4. Error Loading Gameweek
  if (error && !gameweek) {
    return (
      <AppShell
        username={username}
        mainClassName="flex-1 px-4 sm:px-5 py-8 pb-bottom-nav flex flex-col items-center justify-center gap-4 text-center overflow-x-hidden"
      >
        <p className="text-cinnabar">{t('loadError')}</p>
        <p className="text-ivory/70 text-sm">{error}</p>
        <button
          type="button"
          onClick={retryGameweekLoad}
          className="mt-2 bg-lime-yellow text-midnight-violet py-3 px-6 rounded-lg font-semibold hover:bg-opacity-90 transition-colors active:bg-opacity-80"
        >
          {t('loadErrorRetry')}
        </button>
        <Link
          href="/dashboard/"
          className="text-lime-yellow underline text-sm mt-3"
        >
          {tPicks('backToDashboard')}
        </Link>
      </AppShell>
    )
  }

  // 5. No Gameweek / Not Found
  if (emptyReason === 'no-week' || !gameweek) {
    return (
      <AppShell
        username={username}
        mainClassName="flex-1 px-4 sm:px-5 py-8 pb-bottom-nav flex flex-col items-center justify-center gap-4 text-center overflow-x-hidden"
      >
        <p className="text-ivory text-lg font-semibold">{tPicks('gameweekNotFound')}</p>
        <p className="text-ivory/70 text-sm max-w-md">{tPicks('gameweekNotFoundDesc')}</p>
        <Link
          href="/dashboard/"
          className="mt-4 inline-block bg-lime-yellow text-midnight-violet py-3 px-6 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
        >
          {tPicks('returnToDashboard')}
        </Link>
      </AppShell>
    )
  }

  // 6. Published week with no fixtures on record
  if (emptyReason === 'no-fixtures') {
    return (
      <PicksClient
        gameweek={gameweek}
        competition={competition}
        playerCount={gameweek.playerCount}
        matches={[]}
        username={username}
        fixturesPending
      />
    )
  }

  if (displayMatches.length === 0) {
    return (
      <PicksClient
        gameweek={gameweek}
        competition={competition}
        playerCount={gameweek.playerCount}
        matches={[]}
        username={username}
        fixturesPending={fixturesStillLoading}
      />
    )
  }

  // 7. Full Picks Client
  return (
    <>
      {showStaleBanner && (
        <div className="fixed top-0 left-0 right-0 z-[95] px-4 py-2 bg-midnight-violet/95 border-b border-ivory/15 text-center text-sm pointer-events-none">
          <p className="text-ivory/80 pointer-events-auto">
            {showStaleRetry ? t('staleDataNotice') : t('refreshingGameweek')}
          </p>
          {showStaleRetry && (
            <button
              type="button"
              onClick={retryGameweekLoad}
              className="mt-1 text-lime-yellow font-semibold underline underline-offset-2 pointer-events-auto"
            >
              {t('loadErrorRetry')}
            </button>
          )}
        </div>
      )}
      <PicksClient
        gameweek={gameweek}
        competition={competition}
        playerCount={gameweek.playerCount}
        matches={displayMatches}
        username={username}
        fixturesPending={fixturesStillLoading}
      />
    </>
  )
}

function PicksLoadingFallback() {
  return (
    <AppShell
      mainClassName="flex-1 px-4 sm:px-5 py-8 pb-bottom-nav flex flex-col items-center justify-center gap-4 text-center overflow-x-hidden"
    >
      <p className="text-ivory">Loading...</p>
    </AppShell>
  )
}

export default function PicksPage() {
  return (
    <Suspense fallback={<PicksLoadingFallback />}>
      <PicksPageContent />
    </Suspense>
  )
}
