'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { RankingsClient } from '@/components/dashboard/RankingsClient'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { getUserDisplayName, getAllTimeRankings } from '@/lib/users'
import {
  RankingEntry,
  GameweekRankingData,
  PastGameweekOption,
} from '@/types/dashboard'
import {
  transformGameweekData,
  getGameweekFixtureDetails,
  getWeeklyRankings,
  RankingsFirestoreReadOptions,
} from '@/lib/rankings'
import { getAllGameweeks, getGameweekById } from '@/lib/admin'
import { SeasonRankingEntry } from '@/lib/seasons'
import {
  fetchActiveSeasonForRankings,
  fetchPrecomputedWeeklyRankingsForRankings,
  fetchSeasonRankingsForRankings,
  seasonDisplayName,
} from '@/lib/seasons-rankings-read'
import { useLocale, useTranslations } from 'next-intl'
import { mergeWeeklyRankingsWithStandings } from '@/lib/weekly-rankings-merge.mjs'
import { fetchCurrentGameweek, LoadBudget } from '@/lib/gameweek-selection'
import {
  readRankingsSessionCache,
  writeRankingsSessionCache,
  clearRankingsSessionCache,
  deserializeRankingsSessionGameweek,
  serializeRankingsSessionGameweek,
} from '@/lib/rankings-cache'
import {
  resolveWeeklyRankingsSliceStatus,
  resolveSeasonBoardStatus,
  shouldRefetchRankingsOnResume,
  shouldWriteRankingsSessionCache,
} from '@/lib/rankings-load-state.mjs'
import { staleBannerShowsRetry, shouldShowDashboardStaleBanner } from '@/lib/dashboard-load-state'

const PAST_GAMEWEEKS_LIMIT = 10

type WeeklyBoardStatus = 'idle' | 'loading' | 'ready' | 'no-week' | 'error'
type WeeklySliceStatus = 'idle' | 'loading' | 'loaded' | 'empty' | 'error'
type SeasonBoardStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export default function RankingsPage() {
  const { user, loading: authLoading } = useAuth()
  const locale = useLocale() as 'en' | 'es-MX'
  const t = useTranslations('rankings')
  const tCommon = useTranslations('common')
  const [username, setUsername] = useState<string | undefined>(undefined)
  const [allTimeRankings, setAllTimeRankings] = useState<RankingEntry[]>([])
  const [weeklyRankings, setWeeklyRankings] = useState<RankingEntry[] | undefined>(undefined)
  const [gameweekData, setGameweekData] = useState<GameweekRankingData | undefined>(undefined)
  const [currentGameweekId, setCurrentGameweekId] = useState<string | null>(null)
  const [currentGameweekData, setCurrentGameweekData] = useState<GameweekRankingData | undefined>(undefined)
  const [currentWeeklyRankings, setCurrentWeeklyRankings] = useState<RankingEntry[] | undefined>(undefined)
  const [completedGameweeks, setCompletedGameweeks] = useState<PastGameweekOption[]>([])
  const [selectedGameweekId, setSelectedGameweekId] = useState<string | null>(null)
  const [latestCompletedGameweekId, setLatestCompletedGameweekId] = useState<string | null>(null)
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const [rankingsError, setRankingsError] = useState<string | null>(null)
  const [seasonRankings, setSeasonRankings] = useState<SeasonRankingEntry[]>([])
  const [seasonTitle, setSeasonTitle] = useState<string | undefined>()
  const [seasonLoading, setSeasonLoading] = useState(true)
  const [weeklyBoardStatus, setWeeklyBoardStatus] = useState<WeeklyBoardStatus>('idle')
  const [weeklySliceStatus, setWeeklySliceStatus] = useState<WeeklySliceStatus>('idle')
  const [seasonBoardStatus, setSeasonBoardStatus] = useState<SeasonBoardStatus>('idle')
  const [servedFromFirestoreCache, setServedFromFirestoreCache] = useState(false)
  const [usingSessionCache, setUsingSessionCache] = useState(false)
  const [isRefreshingRankings, setIsRefreshingRankings] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const lastLoadMetaRef = useRef({ at: 0, failed: false, servedFromCache: false })

  const cacheUid = user?.uid ?? null

  const bumpReload = useCallback(() => {
    clearRankingsSessionCache(cacheUid, locale)
    setReloadKey((k) => k + 1)
  }, [cacheUid, locale])

  useEffect(() => {
    const abortController = new AbortController()

    if (user) {
      getUserDisplayName(user)
        .then((displayName) => {
          if (abortController.signal.aborted) return
          setUsername(displayName)
        })
        .catch((error) => {
          if (abortController.signal.aborted) return
          console.error('Error fetching display name:', error)
          setUsername(user.displayName || undefined)
        })
    } else {
      setUsername(undefined)
    }

    return () => abortController.abort()
  }, [user])

  useEffect(() => {
    const abortController = new AbortController()
    const sessionCache = readRankingsSessionCache(cacheUid, locale)
    const hadCache = Boolean(sessionCache)

    if (hadCache && sessionCache) {
      const cachedGw = deserializeRankingsSessionGameweek(sessionCache.gameweekData)
      if (cachedGw) {
        setGameweekData(cachedGw)
        setCurrentGameweekData(cachedGw)
      }
      setWeeklyRankings(sessionCache.weeklyRankings)
      setCurrentWeeklyRankings(sessionCache.weeklyRankings)
      setCurrentGameweekId(sessionCache.currentGameweekId)
      setSelectedGameweekId(sessionCache.currentGameweekId)
      setSeasonRankings(sessionCache.seasonRankings ?? [])
      setSeasonTitle(sessionCache.seasonTitle)
      setUsingSessionCache(true)
      setWeeklyLoading(false)
      setSeasonLoading(false)
      setWeeklyBoardStatus('ready')
      setWeeklySliceStatus(
        sessionCache.weeklyRankings?.length ? 'loaded' : 'empty'
      )
      setSeasonBoardStatus(
        sessionCache.seasonRankings?.length ? 'ready' : 'empty'
      )
    }

    const loadSeason = async (
      readOpts: RankingsFirestoreReadOptions
    ): Promise<{ failed: boolean; title?: string; standings: SeasonRankingEntry[] }> => {
      if (!hadCache) {
        setSeasonLoading(true)
        setSeasonBoardStatus('loading')
      } else {
        setIsRefreshingRankings(true)
      }
      try {
        const activeSeason = await fetchActiveSeasonForRankings(readOpts)
        if (abortController.signal.aborted) {
          return { failed: false, standings: [] }
        }
        if (!activeSeason) {
          setSeasonTitle(undefined)
          setSeasonRankings([])
          setSeasonBoardStatus(
            resolveSeasonBoardStatus({
              loadFailed: false,
              standingsCount: 0,
              hasActiveSeason: false,
            })
          )
          return { failed: false, standings: [] }
        }
        const title = seasonDisplayName(activeSeason, locale)
        setSeasonTitle(title)
        const standings = await fetchSeasonRankingsForRankings(
          activeSeason.seasonId,
          user?.uid ?? null,
          readOpts
        )
        if (abortController.signal.aborted) {
          return { failed: false, standings: [] }
        }
        setSeasonRankings(standings)
        setSeasonBoardStatus(
          resolveSeasonBoardStatus({
            loadFailed: false,
            standingsCount: standings.length,
            hasActiveSeason: true,
          })
        )
        return { failed: false, title, standings }
      } catch (error) {
        if (abortController.signal.aborted) {
          return { failed: true, standings: [] }
        }
        console.error('Error loading season rankings:', error)
        setSeasonRankings([])
        setSeasonBoardStatus('error')
        return { failed: true, standings: [] }
      } finally {
        if (!abortController.signal.aborted) {
          setSeasonLoading(false)
        }
      }
    }

    const loadWeeklyForGameweek = async (
      gameweekId: string,
      adminGameweek: Awaited<ReturnType<typeof getGameweekById>>,
      readOpts: RankingsFirestoreReadOptions
    ) => {
      if (!adminGameweek) {
        throw new Error('Gameweek missing')
      }
      const fixtures = await getGameweekFixtureDetails(gameweekId, readOpts)
      if (abortController.signal.aborted) return null
      const transformedData = await transformGameweekData(adminGameweek, fixtures)
      if (fixtures.length === 0) {
        return {
          boardStatus: 'ready' as WeeklyBoardStatus,
          sliceStatus: 'empty' as WeeklySliceStatus,
          transformed: transformedData,
          rankings: [] as RankingEntry[],
          gameweekId: adminGameweek.gameweekId,
        }
      }
      try {
        const precomputed = await fetchPrecomputedWeeklyRankingsForRankings(
          gameweekId,
          user?.uid ?? null,
          readOpts
        )
        const rankingsLive = await getWeeklyRankings(gameweekId, user?.uid ?? null, {
          gameweek: adminGameweek,
          fixtures,
          readOptions: readOpts,
          precomputedStandings: precomputed,
        })
        const rankings = mergeWeeklyRankingsWithStandings(
          precomputed,
          rankingsLive
        ) as unknown as RankingEntry[]
        const sliceStatus = resolveWeeklyRankingsSliceStatus({
          succeeded: true,
          rowCount: rankings.length,
        })
        return {
          boardStatus: 'ready' as WeeklyBoardStatus,
          sliceStatus,
          transformed: transformedData,
          rankings,
          gameweekId: adminGameweek.gameweekId,
        }
      } catch (rankingsError) {
        console.error('Error loading weekly standings rows:', rankingsError)
        return {
          boardStatus: 'ready' as WeeklyBoardStatus,
          sliceStatus: 'error' as WeeklySliceStatus,
          transformed: transformedData,
          rankings: undefined,
          gameweekId: adminGameweek.gameweekId,
        }
      }
    }

    const fetchAllRankings = async () => {
      const loadBudget = new LoadBudget()
      const servedFromCacheRef = { current: false }
      const readOpts: RankingsFirestoreReadOptions = {
        budget: loadBudget,
        servedFromCacheRef,
      }

      if (!hadCache) {
        setRankingsLoading(true)
        setWeeklyLoading(true)
        setRankingsError(null)
        setWeeklyBoardStatus('loading')
        setWeeklySliceStatus('loading')
        setServedFromFirestoreCache(false)
      } else {
        setIsRefreshingRankings(true)
        setServedFromFirestoreCache(false)
        servedFromCacheRef.current = false
      }

      let allTimeOk = false
      let weeklyPayload: Awaited<ReturnType<typeof loadWeeklyForGameweek>> | null = null
      let weeklyFailed = false
      let seasonFailed = false

      const seasonPromise = loadSeason(readOpts)

      try {
        const [rankingsResult, currentGameweek, completedGameweeksList] = await Promise.all([
          getAllTimeRankings(user, 100),
          fetchCurrentGameweek(loadBudget, servedFromCacheRef),
          getAllGameweeks({ sortBy: 'date', sortOrder: 'desc' }),
        ])

        if (abortController.signal.aborted) return

        allTimeOk = true
        const completedOnly = completedGameweeksList.filter(
          (gw) => gw.status === 'completed' || gw.status === 'archived'
        )
        const latestCompleted = completedOnly.length > 0 ? completedOnly[0].gameweekId : null
        setLatestCompletedGameweekId(latestCompleted)

        const pastOptions: PastGameweekOption[] = completedGameweeksList
          .slice(0, PAST_GAMEWEEKS_LIMIT)
          .map((gw) => ({ gameweekId: gw.gameweekId, name: gw.name }))
        setCompletedGameweeks(pastOptions)
        setAllTimeRankings(rankingsResult)
        setRankingsLoading(false)

        if (!currentGameweek) {
          setCurrentGameweekId(null)
          setCurrentGameweekData(undefined)
          setCurrentWeeklyRankings(undefined)
          setWeeklyRankings(undefined)
          setGameweekData(undefined)
          setSelectedGameweekId(null)
          setWeeklyBoardStatus('no-week')
          setWeeklySliceStatus('empty')
          weeklyPayload = null
        } else {
          weeklyPayload = await loadWeeklyForGameweek(
            currentGameweek.gameweekId,
            currentGameweek,
            readOpts
          )
          if (abortController.signal.aborted) return
          if (weeklyPayload) {
            weeklyFailed =
              weeklyPayload.sliceStatus === 'error' || weeklyPayload.boardStatus === 'error'
            setCurrentGameweekId(weeklyPayload.gameweekId)
            setSelectedGameweekId(weeklyPayload.gameweekId)
            setWeeklyBoardStatus(weeklyPayload.boardStatus)
            setWeeklySliceStatus(weeklyPayload.sliceStatus)
            if (weeklyPayload.transformed) {
              setCurrentGameweekData(weeklyPayload.transformed)
              setGameweekData(weeklyPayload.transformed)
            }
            setCurrentWeeklyRankings(weeklyPayload.rankings)
            setWeeklyRankings(weeklyPayload.rankings)
          }
        }
      } catch (error) {
        if (abortController.signal.aborted) return
        console.error('Error fetching rankings:', error)
        if (!allTimeOk) {
          setRankingsError('Failed to load rankings. Please try again later.')
        }
        weeklyFailed = true
        setWeeklyBoardStatus('error')
        setWeeklySliceStatus('error')
      } finally {
        if (!abortController.signal.aborted) {
          setRankingsLoading(false)
          setWeeklyLoading(false)
        }
      }

      const seasonResult = await seasonPromise
      if (abortController.signal.aborted) return

      seasonFailed = seasonResult.failed
      const stale = servedFromCacheRef.current
      setServedFromFirestoreCache(stale)
      lastLoadMetaRef.current.at = Date.now()
      lastLoadMetaRef.current.servedFromCache = stale
      lastLoadMetaRef.current.failed = weeklyFailed || seasonFailed

      const sliceStatus =
        weeklyFailed || !weeklyPayload || !('sliceStatus' in weeklyPayload)
          ? 'error'
          : weeklyPayload.sliceStatus
      const servedFromServer = !servedFromCacheRef.current
      const canCacheWeekly =
        !weeklyFailed &&
        weeklyPayload &&
        'transformed' in weeklyPayload &&
        weeklyPayload.transformed &&
        shouldWriteRankingsSessionCache(true, {
          status: sliceStatus,
          servedFromServer,
        })

      if (canCacheWeekly && weeklyPayload && 'transformed' in weeklyPayload) {
        writeRankingsSessionCache({
          version: 1,
          savedAt: Date.now(),
          locale,
          uid: cacheUid,
          currentGameweekId: weeklyPayload.gameweekId ?? null,
          gameweekData: serializeRankingsSessionGameweek(weeklyPayload.transformed),
          weeklyRankings: weeklyPayload.rankings,
          seasonTitle: seasonResult.title,
          seasonRankings: seasonResult.standings,
        })
      } else if (weeklyFailed || seasonFailed) {
        clearRankingsSessionCache(cacheUid, locale)
      }

      setUsingSessionCache(false)
      setIsRefreshingRankings(false)
    }

    if (user) {
      fetchAllRankings()
    } else {
      setAllTimeRankings([])
      setWeeklyRankings(undefined)
      setGameweekData(undefined)
      setCurrentGameweekId(null)
      setCurrentGameweekData(undefined)
      setCurrentWeeklyRankings(undefined)
      setCompletedGameweeks([])
      setSelectedGameweekId(null)
      setLatestCompletedGameweekId(null)
      setRankingsLoading(false)
      setWeeklyLoading(false)
      setSeasonLoading(false)
      setWeeklyBoardStatus('idle')
      setWeeklySliceStatus('idle')
      setSeasonBoardStatus('idle')
    }

    return () => abortController.abort()
  }, [user, locale, reloadKey, cacheUid])

  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return
      const meta = lastLoadMetaRef.current
      if (
        shouldRefetchRankingsOnResume({
          lastFailed: meta.failed,
          lastLoadAtMs: meta.at,
        })
      ) {
        bumpReload()
      }
    }
    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('pageshow', onResume)
    return () => {
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('pageshow', onResume)
    }
  }, [bumpReload])

  useEffect(() => {
    if (!user || !selectedGameweekId || selectedGameweekId === currentGameweekId) {
      if (selectedGameweekId === currentGameweekId) {
        setWeeklyLoading(false)
      }
      return
    }
    const abortController = new AbortController()
    setWeeklyLoading(true)
    setWeeklySliceStatus('loading')

    const loadPastWeek = async () => {
      const loadBudget = new LoadBudget()
      const servedFromCacheRef = { current: false }
      const readOpts: RankingsFirestoreReadOptions = {
        budget: loadBudget,
        servedFromCacheRef,
      }
      try {
        const gameweek = await getGameweekById(selectedGameweekId)
        if (abortController.signal.aborted) return
        if (!gameweek) {
          setWeeklyBoardStatus('error')
          setWeeklySliceStatus('error')
          return
        }
        const result = await (async () => {
          const fixtures = await getGameweekFixtureDetails(selectedGameweekId, readOpts)
          if (fixtures.length === 0) {
            return { transformed: undefined, rankings: undefined as RankingEntry[] | undefined }
          }
          const transformedData = await transformGameweekData(gameweek, fixtures)
          const precomputed = await fetchPrecomputedWeeklyRankingsForRankings(
            selectedGameweekId,
            user.uid,
            readOpts
          )
          const rankingsLive = await getWeeklyRankings(selectedGameweekId, user.uid, {
            gameweek,
            fixtures,
            readOptions: readOpts,
            precomputedStandings: precomputed,
          })
          const rankings = mergeWeeklyRankingsWithStandings(
            precomputed,
            rankingsLive
          ) as unknown as RankingEntry[]
          return { transformed: transformedData, rankings }
        })()
        if (abortController.signal.aborted) return
        setGameweekData(result.transformed)
        setWeeklyRankings(result.rankings)
        setWeeklyBoardStatus(result.transformed ? 'ready' : 'no-week')
        setWeeklySliceStatus(
          resolveWeeklyRankingsSliceStatus({
            succeeded: true,
            rowCount: result.rankings?.length ?? 0,
          })
        )
        if (servedFromCacheRef.current) {
          setServedFromFirestoreCache(true)
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Error loading past week:', error)
          setWeeklyBoardStatus('error')
          setWeeklySliceStatus('error')
          setWeeklyRankings(undefined)
          setGameweekData(undefined)
        }
      } finally {
        if (!abortController.signal.aborted) setWeeklyLoading(false)
      }
    }
    loadPastWeek()
    return () => abortController.abort()
  }, [user, selectedGameweekId, currentGameweekId])

  useEffect(() => {
    if (selectedGameweekId === currentGameweekId && currentGameweekData && currentWeeklyRankings) {
      setGameweekData(currentGameweekData)
      setWeeklyRankings(currentWeeklyRankings)
    }
  }, [selectedGameweekId, currentGameweekId, currentGameweekData, currentWeeklyRankings])

  const handleSelectGameweek = (gameweekId: string | null) => {
    setSelectedGameweekId(gameweekId)
    if (gameweekId === currentGameweekId && currentGameweekData && currentWeeklyRankings) {
      setGameweekData(currentGameweekData)
      setWeeklyRankings(currentWeeklyRankings)
    }
  }

  const initialWeeklyLoading = weeklyLoading && weeklyBoardStatus === 'loading'
  if (authLoading || rankingsLoading || initialWeeklyLoading) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">{tCommon('loading')}</div>
      </div>
    )
  }

  if (!user) {
    return <NotSignedIn />
  }

  if (rankingsError) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center px-4">
        <div className="text-ivory text-center max-w-md">
          <p className="text-lg mb-2">{t('errorLoading')}</p>
          <p className="text-sm text-ivory/70 mb-4">{t('loadFailed')}</p>
          <button
            type="button"
            onClick={bumpReload}
            className="bg-lime-yellow text-midnight-violet py-3 px-6 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  const showStaleBanner = shouldShowDashboardStaleBanner({
    servedFromFirestoreCache,
    refreshFailed: lastLoadMetaRef.current.failed,
    usingSessionCache,
    isRefreshingGameweek: isRefreshingRankings,
  })
  const showStaleRetry = staleBannerShowsRetry({
    servedFromFirestoreCache,
    refreshFailed: lastLoadMetaRef.current.failed,
  })

  return (
  <>
    {showStaleBanner && (
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 bg-midnight-violet/95 border-b border-ivory/15 text-center text-sm">
        <p className="text-ivory/80">{t('staleDataNotice')}</p>
        {showStaleRetry && (
          <button
            type="button"
            onClick={bumpReload}
            className="mt-1 text-lime-yellow font-semibold underline underline-offset-2"
          >
            {t('tryAgain')}
          </button>
        )}
      </div>
    )}
    <RankingsClient
      allTimeRankings={allTimeRankings}
      weeklyRankings={weeklyRankings}
      gameweekData={gameweekData}
      seasonRankings={seasonRankings}
      seasonTitle={seasonTitle}
      seasonLoading={seasonLoading}
      seasonBoardStatus={seasonBoardStatus}
      username={username}
      latestCompletedGameweekId={latestCompletedGameweekId}
      completedGameweeks={completedGameweeks}
      currentGameweekId={currentGameweekId}
      selectedGameweekId={selectedGameweekId}
      onSelectGameweek={handleSelectGameweek}
      weeklyLoading={weeklyLoading}
      weeklyBoardStatus={weeklyBoardStatus}
      weeklySliceStatus={weeklySliceStatus}
      onRetry={bumpReload}
    />
  </>
  )
}