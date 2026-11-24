'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { User } from 'firebase/auth'
import { useAuth } from '@/lib/AuthProvider'
import { ensureUserDocument } from '@/lib/users'
import { savePredictions, PARTIAL_PREDICTIONS_SAVE_ERROR } from '@/lib/predictions'
import { AppShell } from './AppShell'
import { MatchCard } from './MatchCard'
import dynamic from 'next/dynamic'

const SignInModal = dynamic(
  () => import('./SignInModal').then((m) => ({ default: m.SignInModal })),
  { ssr: false }
)
import { GameweekData, MatchCardData, Prediction } from '@/types/dashboard'
import type { CompetitionDocument } from '@/types/competition'
import { GafferDisplayPrefsProvider } from '@/lib/gaffer-display-prefs'
import { useCrowdPickStats } from '@/hooks/useCrowdPickStats'
import { useLanguage } from '@/lib/LanguageProvider'
import { patchDashboardSessionGameweekPlayerCount } from '@/lib/dashboard-cache'
import { playerCountAfterFirstJoinSave } from '@/lib/player-count-display.mjs'
import { PicksBackNav } from './PicksBackNav'
import { PicksFixtureRail } from './PicksFixtureRail'
import { StickySaveBar } from './StickySaveBar'
import { isGameweekPicksWindowOpen } from '@/lib/gameweek-selection'
import { resolveCompetitionDisplayName } from '@/lib/competition-display'
import { pickError, pickLight, pickSuccess } from '@/lib/haptics'
import {
  resolveActiveStepIndex,
  resolveInitialFixtureId,
  resolveNextFixtureId,
} from '@/lib/picks-step-flow'
import { useCountdown } from '@/hooks/useCountdown'

interface PicksClientProps {
  gameweek: GameweekData
  competition?: CompetitionDocument
  playerCount: number
  matches: MatchCardData[]
  username?: string
  fixturesPending?: boolean
}

export function PicksClient({
  gameweek,
  competition,
  playerCount,
  matches,
  username,
  fixturesPending = false,
}: PicksClientProps) {
  const { user } = useAuth()
  const { locale } = useLanguage()
  const t = useTranslations('dashboard')
  const tPicks = useTranslations('picks')
  const [displayPlayerCount, setDisplayPlayerCount] = useState(playerCount)

  useEffect(() => {
    setDisplayPlayerCount(playerCount)
  }, [playerCount, gameweek.gameweekId])

  const containerRef = useRef<HTMLDivElement>(null)
  const [pendingPredictions, setPendingPredictions] = useState<Map<number, Prediction>>(new Map())
  const [savedPredictions, setSavedPredictions] = useState<Map<number, Prediction>>(new Map())
  const [activeFixtureId, setActiveFixtureId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const isSavingRef = useRef(false)
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
    const saved = new Map<number, Prediction>()
    matches.forEach((match) => {
      if (match.userPrediction) {
        saved.set(match.fixtureId, match.userPrediction)
      }
    })
    setSavedPredictions(saved)
  }, [matches])

  useEffect(() => {
    if (matches.length === 0) {
      setActiveFixtureId(null)
      return
    }
    setActiveFixtureId((current) => {
      if (current != null && matches.some((m) => m.fixtureId === current)) {
        return current
      }
      const getSavedOnly = (fixtureId: number): Prediction | null => {
        const match = matches.find((m) => m.fixtureId === fixtureId)
        return match?.userPrediction ?? null
      }
      return resolveInitialFixtureId(matches, getSavedOnly)
    })
  }, [gameweek.gameweekId, matches])

  const picksWindowOpen = isGameweekPicksWindowOpen(gameweek)
  const { formatted: deadlineCountdown } = useCountdown(
    picksWindowOpen ? gameweek.deadline ?? null : null
  )

  const getDisplayPrediction = useCallback(
    (fixtureId: number): Prediction | null => {
      if (pendingPredictions.has(fixtureId)) {
        return pendingPredictions.get(fixtureId) || null
      }
      return savedPredictions.get(fixtureId) || null
    },
    [pendingPredictions, savedPredictions]
  )

  const missingPickCount = matches.filter((m) => getDisplayPrediction(m.fixtureId) == null).length
  const allPicksMade = matches.length > 0 && missingPickCount === 0
  const isDisabled = !picksWindowOpen

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
      if (isDisabled || isSavingRef.current) return

      if (gameweek.status !== 'OPEN') {
        setSaveError(t('gameweekClosed'))
        pickError()
        return
      }

      if (completePredictions.size !== matches.length) {
        setSaveError(t('saveRequiresAllPicks'))
        pickError()
        return
      }

      isSavingRef.current = true
      setIsSaving(true)
      setSaveError(null)
      setSaveSuccess(false)

      try {
        await ensureUserDocument(authUser, username || authUser.displayName || 'Player')
        const saveResult = await savePredictions(
          authUser.uid,
          completePredictions,
          matches,
          gameweek.gameweekId
        )

        if (saveResult.joinedGameweek) {
          setDisplayPlayerCount((current) => {
            const next = playerCountAfterFirstJoinSave(current)
            patchDashboardSessionGameweekPlayerCount(
              authUser.uid,
              locale,
              gameweek.gameweekId,
              next
            )
            return next
          })
        }

        setSavedPredictions((prev) => {
          const next = new Map(prev)
          completePredictions.forEach((prediction, fixtureId) => {
            next.set(fixtureId, prediction)
          })
          return next
        })

        setPendingPredictions(new Map())
        setSaveSuccess(true)
        pickSuccess()
        setCrowdStatsRefreshToken((n) => n + 1)

        setTimeout(() => {
          setSaveSuccess(false)
        }, 3000)
      } catch (error: unknown) {
        console.error('Error saving predictions:', error)
        pickError()
        const message = error instanceof Error ? error.message : null
        if (message === PARTIAL_PREDICTIONS_SAVE_ERROR) {
          setSaveError(t('partialPredictionsSave'))
        } else {
          setSaveError(message || 'Failed to save predictions. Please try again.')
        }
      } finally {
        isSavingRef.current = false
        setIsSaving(false)
      }
    },
    [
      gameweek.gameweekId,
      gameweek.status,
      isDisabled,
      locale,
      matches,
      t,
      username,
    ]
  )

  useEffect(() => {
    if (!user || isDisabled || !allPicksMade || pendingPredictions.size === 0) return
    if (isSavingRef.current) return
    void performSave(user, buildCompletePredictions())
  }, [
    user,
    isDisabled,
    allPicksMade,
    pendingPredictions,
    buildCompletePredictions,
    performSave,
  ])

  const handlePredictionSelect = (fixtureId: number, prediction: Prediction) => {
    if (isDisabled || isSaving) return

    const nextPending = new Map(pendingPredictions)
    nextPending.set(fixtureId, prediction)

    const getPredAfterPick = (id: number): Prediction | null => {
      if (nextPending.has(id)) return nextPending.get(id) ?? null
      return savedPredictions.get(id) ?? null
    }

    const allMadeAfter = matches.every((m) => getPredAfterPick(m.fixtureId) != null)

    setPendingPredictions(nextPending)
    setSaveError(null)
    setSaveSuccess(false)
    pickLight()

    const nextFixtureId = resolveNextFixtureId(matches, getPredAfterPick, fixtureId)
    if (nextFixtureId != null) {
      setActiveFixtureId(nextFixtureId)
    }

    if (allMadeAfter && !user) {
      setIsSignInOpen(true)
    }
  }

  const handleRetrySave = () => {
    if (!user) {
      setIsSignInOpen(true)
      return
    }
    if (!allPicksMade) {
      setSaveError(t('saveRequiresAllPicks'))
      return
    }
    void performSave(user, buildCompletePredictions())
  }

  const activeMatch = useMemo(
    () => matches.find((m) => m.fixtureId === activeFixtureId) ?? matches[0] ?? null,
    [matches, activeFixtureId]
  )

  const stepIndex = activeFixtureId != null ? resolveActiveStepIndex(matches, activeFixtureId) : 1

  const headerTitle =
    competition != null
      ? resolveCompetitionDisplayName(competition, locale)
      : gameweek.name

  const statusFooter =
    isSaving || saveError || saveSuccess ? (
      <div className="w-full flex flex-col gap-2 max-w-md mx-auto">
        {isSaving && (
          <p className="text-center text-sm text-ivory/85">{tPicks('autoSaving')}</p>
        )}
        {saveError && (
          <>
            <div className="bg-cinnabar/20 border border-cinnabar/40 rounded-lg px-3 py-2 text-cinnabar text-sm">
              {saveError}
            </div>
            <button
              type="button"
              onClick={handleRetrySave}
              disabled={isSaving}
              className="w-full bg-lime-yellow text-midnight-violet py-3 px-4 rounded-lg font-semibold hover:bg-lime-yellow/90 disabled:opacity-50 min-h-[44px]"
            >
              {tPicks('retrySave')}
            </button>
          </>
        )}
        {saveSuccess && (
          <div className="bg-lime-yellow/20 border border-lime-yellow/40 rounded-lg px-3 py-2 text-lime-yellow text-sm text-center">
            {tPicks('allPicksSaved')}
          </div>
        )}
      </div>
    ) : null

  const showStickyFooter = Boolean(statusFooter)
  const mobileScrollPad = showStickyFooter
    ? 'max-lg:pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+7.5rem)]'
    : undefined

  return (
    <AppShell
      containerRef={containerRef}
      username={username}
      banner={
        <PicksBackNav href="/dashboard/">{tPicks('backToDashboard')}</PicksBackNav>
      }
      mainClassName={
        mobileScrollPad
          ? `flex-1 px-4 sm:px-5 py-2.5 pb-bottom-nav ${mobileScrollPad} flex flex-col items-center gap-4 overflow-x-hidden`
          : 'flex-1 px-4 sm:px-5 py-2.5 pb-bottom-nav flex flex-col items-center gap-4 overflow-x-hidden'
      }
      footer={
        <>
          {showStickyFooter && <StickySaveBar>{statusFooter}</StickySaveBar>}
          <SignInModal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />
        </>
      }
    >
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-3 min-w-0">
        <header className="w-full min-w-0 leading-none">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-sm font-bold text-ivory truncate min-w-0">{headerTitle}</h1>
            {matches.length > 0 && activeMatch ? (
              <span
                className="text-[10px] font-bold text-lime-yellow tabular-nums shrink-0"
                aria-label={tPicks('stepProgress', { current: stepIndex, total: matches.length })}
              >
                {stepIndex}/{matches.length}
              </span>
            ) : null}
          </div>
          {picksWindowOpen && deadlineCountdown ? (
            <p className="text-[10px] text-ivory/55 tabular-nums mt-1 truncate">
              {tPicks('closesIn', { time: deadlineCountdown })}
            </p>
          ) : (
            <p className="text-[10px] text-ivory/55 mt-1 truncate">{gameweek.name}</p>
          )}
        </header>

        <PicksFixtureRail
          matches={matches}
          activeFixtureId={activeFixtureId}
          getPrediction={getDisplayPrediction}
          onSelect={(fixtureId) => {
            if (fixtureId !== activeFixtureId) {
              setActiveFixtureId(fixtureId)
            }
          }}
          disabled={isSaving}
        />

        {fixturesPending && (
          <p className="text-ivory/80 text-sm text-center py-4">{t('fixturesLoading')}</p>
        )}

        <GafferDisplayPrefsProvider>
          {activeMatch ? (
            <div
              key={activeMatch.fixtureId}
              className="w-full animate-[picksCardIn_220ms_ease-out]"
            >
              <MatchCard
                match={activeMatch}
                userPrediction={getDisplayPrediction(activeMatch.fixtureId)}
                onPredictionSelect={handlePredictionSelect}
                disabled={isDisabled || isSaving}
                crowdPickStats={crowdStatsByFixture.get(activeMatch.fixtureId)}
                crowdPickPercents={crowdPercentsByFixture.get(activeMatch.fixtureId)}
                crowdPickCount={playerCountByFixture.get(activeMatch.fixtureId) ?? 0}
              />
            </div>
          ) : null}
        </GafferDisplayPrefsProvider>

        {displayPlayerCount > 0 && (
          <p className="text-center text-[11px] text-ivory/50">
            {t('crowdPicksSubtitle', { count: displayPlayerCount })}
          </p>
        )}
      </div>
    </AppShell>
  )
}