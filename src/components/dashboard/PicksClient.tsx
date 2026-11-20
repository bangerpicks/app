'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { User } from 'firebase/auth'
import { useAuth } from '@/lib/AuthProvider'
import { ensureUserDocument } from '@/lib/users'
import { savePredictions, PARTIAL_PREDICTIONS_SAVE_ERROR } from '@/lib/predictions'
import { AppShell } from './AppShell'
import { GameweekCard } from './GameweekCard'
import { MatchCard } from './MatchCard'
import { SignInModal } from './SignInModal'
import { GameweekData, MatchCardData, Prediction } from '@/types/dashboard'
import { GafferDisplayPrefsProvider } from '@/lib/gaffer-display-prefs'
import { useCrowdPickStats } from '@/hooks/useCrowdPickStats'
import { useLanguage } from '@/lib/LanguageProvider'
import { patchDashboardSessionGameweekPlayerCount } from '@/lib/dashboard-cache'
import { playerCountAfterFirstJoinSave } from '@/lib/player-count-display.mjs'
import { PicksBackNav } from './PicksBackNav'
import { StickySaveBar } from './StickySaveBar'

interface PicksClientProps {
  gameweek: GameweekData
  playerCount: number
  matches: MatchCardData[]
  username?: string
  fixturesPending?: boolean
}

export function PicksClient({
  gameweek,
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
    const saved = new Map<number, Prediction>()
    matches.forEach((match) => {
      if (match.userPrediction) {
        saved.set(match.fixtureId, match.userPrediction)
      }
    })
    setSavedPredictions(saved)
  }, [matches])

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
        setCrowdStatsRefreshToken((n) => n + 1)

        setTimeout(() => {
          setSaveSuccess(false)
        }, 3000)
      } catch (error: unknown) {
        console.error('Error saving predictions:', error)
        const message = error instanceof Error ? error.message : null
        if (message === PARTIAL_PREDICTIONS_SAVE_ERROR) {
          setSaveError(t('partialPredictionsSave'))
        } else {
          setSaveError(message || 'Failed to save predictions. Please try again.')
        }
      } finally {
        setIsSaving(false)
      }
    },
    [
      gameweek.gameweekId,
      gameweek.status,
      isDisabled,
      isSaving,
      locale,
      matches,
      t,
      username,
    ]
  )

  const handleSubmit = async () => {
    if (!user) {
      setIsSignInOpen(true)
      return
    }
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

  const hasPendingPredictions = pendingPredictions.size > 0
  const hasAnyPicks = matches.some((m) => getDisplayPrediction(m.fixtureId) != null)
  const canSave = hasPendingPredictions && allPicksMade && !isSaving

  const saveButtonLabel = () => {
    if (isSaving) return t('saving')
    if (!allPicksMade) {
      return t('picksRemainingToSave', { count: missingPickCount })
    }
    if (hasPendingPredictions) {
      return pendingPredictions.size === 1
        ? t('savePrediction', { count: pendingPredictions.size })
        : t('savePredictions', { count: pendingPredictions.size })
    }
    return t('noChangesToSave')
  }

  const saveBlock = !isDisabled && matches.length > 0 && (
    <div className="w-full flex flex-col gap-2 max-w-md lg:max-w-none">
      {saveError && (
        <div className="bg-cinnabar/20 border border-cinnabar/40 rounded-lg px-3 py-2 text-cinnabar text-sm">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="bg-lime-yellow/20 border border-lime-yellow/40 rounded-lg px-3 py-2 text-lime-yellow text-sm">
          {t('savedSuccessfully')}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSave}
        className="w-full bg-lime-yellow text-midnight-violet py-3 px-4 rounded-lg font-semibold hover:bg-lime-yellow/90 active:bg-lime-yellow/80 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-colors"
      >
        {saveButtonLabel()}
      </button>
    </div>
  )

  const matchList = (
    <>
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
    </>
  )

  const showMobileSave = Boolean(saveBlock)
  const mobileScrollPad =
    showMobileSave && (saveError || saveSuccess)
      ? 'max-lg:pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+8.5rem)]'
      : 'max-lg:pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+5.25rem)]'

  return (
    <AppShell
      containerRef={containerRef}
      username={username}
      banner={
        <PicksBackNav href="/dashboard/">{tPicks('backToDashboard')}</PicksBackNav>
      }
      mainClassName={
        showMobileSave
          ? `flex-1 px-4 sm:px-5 py-2.5 pb-bottom-nav ${mobileScrollPad} flex flex-col items-center gap-5 overflow-x-hidden`
          : 'flex-1 px-4 sm:px-5 py-2.5 pb-bottom-nav flex flex-col items-center gap-5 overflow-x-hidden'
      }
      footer={
        <>
          {saveBlock && <StickySaveBar>{saveBlock}</StickySaveBar>}
          <SignInModal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />
        </>
      }
    >
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-5 lg:gap-6">
        {/* Mobile Gameweek Card */}
        <div className="w-full flex flex-col items-center gap-5 lg:hidden">
          <GameweekCard
            gameweek={gameweek}
            playerCount={displayPlayerCount}
            hasAnyPicks={hasAnyPicks}
            isInteractive={false}
            fixtureMatches={matches}
          />
        </div>

        {/* Match Slate + Desktop Sidebar */}
        <GafferDisplayPrefsProvider>
          <div className="w-full lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6 lg:items-start">
            <div className="flex flex-col gap-5 w-full min-w-0">{matchList}</div>

            <aside className="hidden lg:flex flex-col gap-5 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:self-start w-full">
              <GameweekCard
                gameweek={gameweek}
                playerCount={displayPlayerCount}
                hasAnyPicks={hasAnyPicks}
                isInteractive={false}
                fixtureMatches={matches}
              />

              {saveBlock}
            </aside>
          </div>
        </GafferDisplayPrefsProvider>

      </div>
    </AppShell>
  )
}
