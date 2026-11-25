'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { AppShell } from '@/components/dashboard/AppShell'
import { PicksBackNav } from '@/components/dashboard/PicksBackNav'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { RankingsTable } from '@/components/dashboard/RankingsTable'
import { getUserDisplayName } from '@/lib/users'
import { getGameweekById } from '@/lib/admin'
import {
  transformGameweekData,
  getGameweekFixtureDetails,
  getWeeklyRankings,
  mergeWeeklyRankingsForTable,
  type RankingsFirestoreReadOptions,
} from '@/lib/rankings'
import { fetchPrecomputedWeeklyRankingsForRankings } from '@/lib/seasons-rankings-read'
import { hasWeeklyRankingsTableRows } from '@/lib/weekly-rankings-merge.mjs'
import {
  resolveWeeklyRankingsSliceStatus,
  shouldShowWeeklyRankingsError,
  shouldShowWeeklyStandingsEmptyCopy,
} from '@/lib/rankings-load-state.mjs'
import { LoadBudget } from '@/lib/gameweek-selection'
import type { GameweekRankingData, RankingEntry } from '@/types/dashboard'
import { pickPluralKey } from '@/lib/i18n-plural.mjs'
import { COMPETITIONS_HOME_PATH } from '@/lib/app-routes'

function RankingsGameweekPageContent() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const tRankings = useTranslations('rankings')
  const tDashboard = useTranslations('dashboard')
  const tPicks = useTranslations('picks')
  const tCommon = useTranslations('common')

  const gameweekId = searchParams.get('id')?.trim() ?? ''

  const [username, setUsername] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [sliceStatus, setSliceStatus] = useState<'idle' | 'loading' | 'loaded' | 'empty' | 'error'>(
    'idle'
  )
  const [gameweekData, setGameweekData] = useState<GameweekRankingData | undefined>()
  const [weeklyRankings, setWeeklyRankings] = useState<RankingEntry[] | undefined>()
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const bumpReload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!user) {
      setUsername(undefined)
      return
    }
    getUserDisplayName(user)
      .then((name) => setUsername(name ?? user.displayName ?? undefined))
      .catch(() => setUsername(user.displayName ?? undefined))
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!user || !gameweekId) {
      setLoading(false)
      return
    }

    const abort = new AbortController()
    const loadBudget = new LoadBudget()
    const readOpts: RankingsFirestoreReadOptions = { budget: loadBudget }

    const uid = user.uid

    async function load() {
      setLoading(true)
      setLoadError(false)
      setSliceStatus('loading')
      setGameweekData(undefined)
      setWeeklyRankings(undefined)

      try {
        const adminGameweek = await getGameweekById(gameweekId)
        if (abort.signal.aborted) return
        if (!adminGameweek) {
          setLoadError(true)
          setSliceStatus('error')
          return
        }

        const fixtures = await getGameweekFixtureDetails(gameweekId, readOpts)
        if (abort.signal.aborted) return
        const transformed = await transformGameweekData(adminGameweek, fixtures)
        setGameweekData(transformed)

        if (fixtures.length === 0) {
          setWeeklyRankings([])
          setSliceStatus('empty')
          return
        }

        const precomputed = await fetchPrecomputedWeeklyRankingsForRankings(
          gameweekId,
          uid,
          readOpts
        )
        const rankingsLive = await getWeeklyRankings(gameweekId, uid, {
          gameweek: adminGameweek,
          fixtures,
          readOptions: readOpts,
          precomputedStandings: precomputed,
        })
        const rankings = await mergeWeeklyRankingsForTable(
          precomputed,
          rankingsLive,
          readOpts
        )

        if (abort.signal.aborted) return
        setWeeklyRankings(rankings)
        setSliceStatus(
          resolveWeeklyRankingsSliceStatus({
            succeeded: true,
            rowCount: rankings.length,
          })
        )
      } catch (err) {
        console.error('[rankings/gw] load failed:', err)
        if (!abort.signal.aborted) {
          setLoadError(true)
          setSliceStatus('error')
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => abort.abort()
  }, [authLoading, user, gameweekId, reloadKey])

  if (authLoading || (user && gameweekId && loading)) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">{tCommon('loading')}</div>
      </div>
    )
  }

  if (!user) {
    return <NotSignedIn />
  }

  if (!gameweekId) {
    return (
      <AppShell username={username} mainClassName="flex-1 px-4 py-12 flex flex-col items-center gap-4">
        <p className="text-ivory/80 text-center max-w-sm">{tDashboard('gameweekMissingId')}</p>
        <Link
          href={COMPETITIONS_HOME_PATH}
          className="bg-lime-yellow text-midnight-violet py-2 px-5 rounded-lg font-semibold text-sm"
        >
          {tPicks('backToDashboard')}
        </Link>
      </AppShell>
    )
  }

  const showTable = hasWeeklyRankingsTableRows(weeklyRankings)
  const playerCount = gameweekData?.gameweek.playerCount ?? 0
  const weeklyBoardStatus = gameweekData ? 'ready' : loadError ? 'error' : 'no-week'
  const showWeeklyError = shouldShowWeeklyRankingsError(
    playerCount,
    sliceStatus,
    weeklyBoardStatus
  )
  const showWeeklyEmptyCopy = shouldShowWeeklyStandingsEmptyCopy(
    weeklyBoardStatus,
    sliceStatus,
    playerCount
  )
  const lockViewport = Boolean(gameweekData) && showTable

  return (
    <AppShell
      username={username}
      banner={
        <PicksBackNav href={COMPETITIONS_HOME_PATH}>{tPicks('backToDashboard')}</PicksBackNav>
      }
      shellClassName={lockViewport ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : undefined}
      mainClassName={`flex-1 min-h-0 px-4 sm:px-5 pb-bottom-nav flex flex-col items-center gap-3 py-2 ${
        lockViewport ? 'overflow-hidden' : ''
      }`}
    >
      {gameweekData ? (
        <div className="w-full max-w-4xl shrink-0 text-center">
          <h1 className="text-lg sm:text-xl font-black text-ivory truncate">
            {gameweekData.gameweek.name}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-ivory/60 mt-0.5">
            {tRankings(
              pickPluralKey(playerCount, 'playerCountOne', 'playerCountMany'),
              { count: playerCount }
            )}
          </p>
        </div>
      ) : loadError ? (
        <h1 className="text-lg font-bold text-ivory">{tRankings('title')}</h1>
      ) : null}

      <div
        className={`w-full flex min-h-0 flex-col ${
          lockViewport ? 'max-w-none flex-1 -mx-4 sm:-mx-5' : 'max-w-4xl'
        }`}
      >
        {showTable && gameweekData ? (
          <div className="rankings-table-bordered-host rankings-this-week-shell w-full min-h-0 flex-1 border-2 border-ivory/20 bg-midnight-violet sm:rounded-lg">
            <RankingsTable rankings={weeklyRankings!} gameweekData={gameweekData} fillViewport />
          </div>
        ) : loadError || sliceStatus === 'error' || showWeeklyError ? (
          <div className="w-full rounded-lg border-2 border-ivory/20 bg-midnight-violet px-4 py-10 flex flex-col items-center gap-3">
            <p className="text-ivory/80 text-sm text-center max-w-sm">{tRankings('loadFailed')}</p>
            <button
              type="button"
              onClick={bumpReload}
              className="bg-lime-yellow text-midnight-violet py-2 px-5 rounded-lg font-semibold text-sm"
            >
              {tRankings('tryAgain')}
            </button>
          </div>
        ) : showWeeklyEmptyCopy ? (
          <div className="w-full rounded-lg border-2 border-ivory/20 bg-midnight-violet px-4 py-10 text-center">
            <p className="text-ivory/70 text-sm max-w-sm mx-auto">{tRankings('weeklyStandingsEmpty')}</p>
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}

export default function RankingsGameweekPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
          <div className="text-ivory">Loading…</div>
        </div>
      }
    >
      <RankingsGameweekPageContent />
    </Suspense>
  )
}