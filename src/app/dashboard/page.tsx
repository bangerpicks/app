'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/lib/AuthProvider'
import { getUserDisplayName, hasSeenOnboardingIntro } from '@/lib/users'
import { getUserPredictionsForGameweek, getGameweekPlayerCount } from '@/lib/predictions'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { OnboardingIntro } from '@/components/dashboard/OnboardingIntro'
import { BottomNavigation } from '@/components/dashboard/BottomNavigation'
import { Header } from '@/components/dashboard/Header'
import { GameweekData, MatchCardData, FormResult } from '@/types/dashboard'
import { getGameweekFixtures, AdminGameweekData, GameweekFixtureData } from '@/lib/admin'
import { useLiveMatches } from '@/lib/useLiveMatches'
import { useLanguage } from '@/lib/LanguageProvider'
import { formatMatchKickoffTime } from '@/lib/locale-format'
import type { Locale } from '@/i18n/config'
import {
  fetchCurrentGameweek,
  mapAdminGameweekToDashboardStatus,
  resolvePlayerCountFromGameweek,
  getEffectiveDeadline,
} from '@/lib/gameweek-selection'

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

  const apiStatus = fixture.status.short
  let matchStatus: string
  if (apiStatus === 'NS' || apiStatus === 'TBD') {
    matchStatus = 'TBP'
  } else if (
    apiStatus === '1H' ||
    apiStatus === '2H' ||
    apiStatus === 'HT' ||
    apiStatus === 'ET' ||
    apiStatus === 'P'
  ) {
    matchStatus = 'LIVE'
  } else {
    matchStatus = apiStatus
  }

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
    date: fixtureDate,
    time: formatMatchKickoffTime(fixtureDate, locale),
    homeTeam: {
      id: fixtureData.teams.home.id,
      name: fixtureData.teams.home.name,
      logo: fixtureData.teams.home.logo,
      position: teamPositions.get(fixtureData.teams.home.id) || 0,
      form: teamForms.get(fixtureData.teams.home.id) || [],
    },
    awayTeam: {
      id: fixtureData.teams.away.id,
      name: fixtureData.teams.away.name,
      logo: fixtureData.teams.away.logo,
      position: teamPositions.get(fixtureData.teams.away.id) || 0,
      form: teamForms.get(fixtureData.teams.away.id) || [],
    },
    matchStatus,
    minute,
    score,
    whyItMatters: fixtureData.whyItMatters,
    whyItMatters_esMX: fixtureData.whyItMatters_esMX,
    officialPick: fixtureData.officialPick,
    officialConfidence: fixtureData.officialConfidence,
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
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex flex-col">
      <Header username={username} />
      <main className="flex-1 px-4 sm:px-5 py-8 pb-20 flex flex-col items-center justify-center gap-4 text-center">
        {children}
      </main>
      <BottomNavigation />
    </div>
  )
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
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
  const [emptyReason, setEmptyReason] = useState<'none' | 'no-week' | 'no-fixtures' | null>(null)

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

    async function fetchActiveGameweek() {
      try {
        setLoadingGameweek(true)
        setError(null)
        setEmptyReason(null)
        setGameweek(null)
        setInitialMatches([])
        setGameweekId(null)

        const currentGameweek = await fetchCurrentGameweek()

        if (abortController.signal.aborted) return

        if (!currentGameweek) {
          setEmptyReason('no-week')
          setLoadingGameweek(false)
          return
        }

        const fixtures = await getGameweekFixtures(currentGameweek.gameweekId)

        if (abortController.signal.aborted) return

        if (fixtures.length === 0) {
          setGameweek(convertGameweekData(currentGameweek))
          setGameweekId(currentGameweek.gameweekId)
          setEmptyReason('no-fixtures')
          setLoadingGameweek(false)
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

        setGameweekId(currentGameweek.gameweekId)
        setGameweek(convertGameweekData(currentGameweek))
        setInitialMatches(sortedMatches)
        setLoadingGameweek(false)

        const storedCount = resolvePlayerCountFromGameweek(currentGameweek)
        if (
          storedCount !== undefined &&
          currentGameweek.fixtureIds &&
          currentGameweek.fixtureIds.length > 0
        ) {
          getGameweekPlayerCount(currentGameweek.fixtureIds, currentGameweek.gameweekId)
            .then((playerCount) => {
              if (abortController.signal.aborted) return
              setGameweek((prev) => (prev ? { ...prev, playerCount } : null))
            })
            .catch(() => {
              // Keep stored count on refetch failure
            })
        } else if (currentGameweek.fixtureIds && currentGameweek.fixtureIds.length > 0) {
          getGameweekPlayerCount(currentGameweek.fixtureIds, currentGameweek.gameweekId)
            .then((playerCount) => {
              if (abortController.signal.aborted) return
              setGameweek((prev) => (prev ? { ...prev, playerCount } : null))
            })
            .catch(() => {
              /* leave count unchanged */
            })
        }

        if (user) {
          setLoadingPredictions(true)
          try {
            const fixtureIds = sortedMatches.map((match) => match.fixtureId)
            const predictions = await getUserPredictionsForGameweek(
              user.uid,
              currentGameweek.gameweekId,
              fixtureIds
            )

            if (abortController.signal.aborted) return

            setInitialMatches((prevMatches) =>
              prevMatches.map((match) => ({
                ...match,
                userPrediction: predictions.get(match.fixtureId) || null,
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
        setError(message)
        setGameweek(null)
        setInitialMatches([])
        setGameweekId(null)
        setLoadingGameweek(false)
        setLoadingPredictions(false)
      }
    }

    fetchActiveGameweek()

    return () => {
      abortController.abort()
    }
  }, [user])

  const baseMatches = useMemo(
    () =>
      initialMatches.map((m) => ({
        ...m,
        time: formatMatchKickoffTime(m.date, locale),
      })),
    [initialMatches, locale]
  )
  const liveMatches = useLiveMatches(gameweekId, baseMatches, locale)

  if (authLoading || loadingGameweek) {
    return (
      <DashboardShell username={username}>
        <p className="text-ivory">{t('loading')}</p>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell username={username}>
        <p className="text-cinnabar">{t('loadError')}</p>
        <p className="text-ivory/70 text-sm">{error}</p>
      </DashboardShell>
    )
  }

  if (emptyReason === 'no-week') {
    return (
      <>
        <DashboardShell username={username}>
          <p className="text-ivory text-lg font-semibold">{t('noActiveGameweekTitle')}</p>
          <p className="text-ivory/70 text-sm max-w-md">{t('noActiveGameweekBody')}</p>
        </DashboardShell>
        <OnboardingIntro
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          requiresDisplayName={
            user ? !user.displayName || user.displayName.trim() === 'Player' : false
          }
        />
      </>
    )
  }

  if (!gameweek) {
    return (
      <DashboardShell username={username}>
        <p className="text-ivory">{t('loadError')}</p>
      </DashboardShell>
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
        <OnboardingIntro
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          requiresDisplayName={
            user ? !user.displayName || user.displayName.trim() === 'Player' : false
          }
        />
      </>
    )
  }

  return (
    <>
      <DashboardClient
        gameweek={gameweek}
        playerCount={gameweek.playerCount}
        matches={liveMatches}
        username={username}
      />
      <OnboardingIntro
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        requiresDisplayName={
          user ? !user.displayName || user.displayName.trim() === 'Player' : false
        }
      />
    </>
  )
}
