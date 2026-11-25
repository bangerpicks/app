'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useLanguage } from '@/lib/LanguageProvider'
import { GameweekData, MatchCardData } from '@/types/dashboard'
import { useCountdown, type CountdownTime } from '@/hooks/useCountdown'
import { useMemo, useState, type ReactNode } from 'react'
import { GameweekMatchPreviewPills } from './GameweekMatchPreviewPills'
import {
  resolveGameweekDisplayPhase,
  type GameweekDisplayPhase,
  type UrgencyLevel,
} from '@/lib/gameweek-display-phase'
import {
  fixturesStateFromMatches,
  useGameweekFixtures,
} from '@/hooks/useGameweekFixtures'
import { useGameweekHasPicks } from '@/hooks/useGameweekHasPicks'
import { resolveGameweekCardBranding } from '@/lib/gameweek-card-branding'
import { brandGameweekForCompetition } from '@/lib/competition-display'
import { GameweekCardHeader } from './GameweekCardHeader'
import { LeagueActionsSheet } from './LeagueActionsSheet'
import { GameweekCardMetaRow } from './GameweekCardMetaRow'
import { isGameweekPicksWindowOpen } from '@/lib/gameweek-selection'
import type { CompetitionDocument } from '@/types/competition'
import { resolveCompetitionHeaderLeagueBrand } from '@/lib/competition-league-brand'
import { resolveGameweekCardPhaseChrome } from '@/lib/gameweek-card-phase-chrome'
import {
  shouldShowGameweekTableCta,
  shouldShowPersonalGameweekCta,
  personalGameweekCtaMessageKey,
  gameweekCardNoteOverrideKey,
} from '@/lib/gameweek-card-cta-logic.mjs'

interface GameweekCardProps {
  gameweek: GameweekData
  playerCount: number
  /** Saved or pending picks; omit on dashboard to load from Firestore when signed in. */
  hasAnyPicks?: boolean
  href?: string
  onTimerClick?: () => void
  /** When false (e.g. inside the picks-page sidebar) the CTA button is hidden. */
  isInteractive?: boolean
  /** Show compact live / upcoming fixture pills (dashboard competition cards). */
  showMatchPreviews?: boolean
  /** When set (picks page), phase + pills use this list instead of a second Firestore load. */
  fixtureMatches?: MatchCardData[]
  /** Enables Liga MX (etc.) header badge when the slate is single-league. */
  competition?: CompetitionDocument
  showLeagueActions?: boolean
  pendingLeaveGameweekId?: string | null
  onLeagueMembershipChange?: () => void
}

const PHASE_LABEL_KEY: Record<
  GameweekDisplayPhase,
  | 'gameweekStatusOpen'
  | 'gameweekPhaseClosingSoon'
  | 'gameweekPhasePicksLocked'
  | 'gameweekPhaseLive'
  | 'gameweekPhaseFinal'
  | 'gameweekStatusUpcoming'
  | 'gameweekStatusCompleted'
> = {
  OPEN: 'gameweekStatusOpen',
  CLOSING_SOON: 'gameweekPhaseClosingSoon',
  PICKS_LOCKED: 'gameweekPhasePicksLocked',
  LIVE: 'gameweekPhaseLive',
  FINAL: 'gameweekPhaseFinal',
  UPCOMING: 'gameweekStatusUpcoming',
  COMPLETED: 'gameweekStatusCompleted',
}

function legacyPhaseFromStatus(status: GameweekData['status']): GameweekDisplayPhase {
  switch (status) {
    case 'UPCOMING':
      return 'UPCOMING'
    case 'COMPLETED':
      return 'COMPLETED'
    case 'OPEN':
      return 'OPEN'
    default:
      return 'PICKS_LOCKED'
  }
}

interface StatusBadgeProps {
  phase: GameweekDisplayPhase
  urgencyLevel: UrgencyLevel
  picksWindowOpen: boolean
  time: CountdownTime
  formatted: string
  compact?: boolean
}

function StatusBadge({
  phase,
  urgencyLevel,
  picksWindowOpen,
  time,
  formatted,
  compact = false,
}: StatusBadgeProps) {
  const t = useTranslations('dashboard')

  const getBadgeColor = () => {
    if (phase === 'CLOSING_SOON' && urgencyLevel === 'critical') {
      return 'bg-cinnabar text-midnight-violet'
    }
    if (phase === 'CLOSING_SOON' && urgencyLevel === 'warning') {
      return 'bg-amber-glow text-midnight-violet'
    }
    switch (phase) {
      case 'OPEN':
      case 'CLOSING_SOON':
        return 'bg-lime-yellow/20 text-lime-yellow border border-lime-yellow/50'
      case 'PICKS_LOCKED':
        return 'bg-ivory/10 text-ivory/80 border border-ivory/25'
      case 'LIVE':
        return 'bg-cinnabar/25 text-cinnabar border border-cinnabar/50'
      case 'FINAL':
        return 'bg-ivory/10 text-ivory/70 border border-ivory/30'
      case 'UPCOMING':
        return 'bg-amber-glow/20 text-amber-glow border border-amber-glow/40'
      case 'COMPLETED':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    }
  }

  const shouldPulse =
    phase === 'CLOSING_SOON' && (urgencyLevel === 'warning' || urgencyLevel === 'critical')
  const pulseClass = urgencyLevel === 'critical' ? 'animate-pulse' : 'animate-pulse-slow'
  const livePulse = phase === 'LIVE' ? 'animate-pulse-slow' : ''

  const showCountdown =
    (phase === 'OPEN' || phase === 'CLOSING_SOON') &&
    picksWindowOpen &&
    time &&
    !time.isExpired

  const sizeClass = compact
    ? 'gap-1.5 px-2.5 py-1 text-[10px] sm:text-[11px]'
    : 'gap-2 px-3 py-1.5 text-xs'

  return (
    <div
      className={`inline-flex items-center max-w-full ${sizeClass} rounded-full font-semibold ${getBadgeColor()} ${
        shouldPulse ? pulseClass : ''
      } ${livePulse}`}
    >
      <span className="font-black italic truncate">{t(PHASE_LABEL_KEY[phase])}</span>
      {showCountdown && (
        <>
          <span className="opacity-50">•</span>
          <span className="tabular-nums font-semibold">{formatted}</span>
        </>
      )}
    </div>
  )
}

const CTA_MIN_H = 'min-h-[52px]'
const CTA_SPLIT_TEXT = 'text-sm sm:text-base'

interface GameweekCardCTAsProps {
  phase: GameweekDisplayPhase
  picksHref: string
  gameweekId: string
  onClick?: () => void
  urgencyLevel: UrgencyLevel
  hasAnyPicks: boolean
  playerCount: number
}

function gameweekTableHref(gameweekId: string) {
  return `/rankings/gw/?id=${encodeURIComponent(gameweekId)}`
}

function GameweekCardCTAs({
  phase,
  picksHref,
  gameweekId,
  onClick,
  urgencyLevel,
  hasAnyPicks,
  playerCount,
}: GameweekCardCTAsProps) {
  const t = useTranslations('dashboard')
  const tableHref = gameweekTableHref(gameweekId)
  const showTable = shouldShowGameweekTableCta(phase, hasAnyPicks, playerCount)
  const showPersonal = shouldShowPersonalGameweekCta(phase, hasAnyPicks)
  const splitLayout = showPersonal && showTable
  const flexBtn = splitLayout ? `flex-1 min-w-0 ${CTA_SPLIT_TEXT}` : 'w-full'

  const tableButton = (
    <Link
      href={tableHref}
      className={`${flexBtn} flex items-center justify-center ${CTA_MIN_H} rounded-[12px] border-2 border-lime-yellow/40 bg-lime-yellow/10 hover:bg-lime-yellow/20 hover:border-lime-yellow/70 transition-all duration-200 hover:scale-[1.01] active:scale-95 group`}
      aria-label={t('leaderboard')}
    >
      <span className="font-black italic tracking-wide text-lime-yellow text-center px-1 group-hover:brightness-110">
        {t('leaderboard')}
      </span>
    </Link>
  )

  const layoutCTAs = (picksNode: ReactNode | null) => {
    if (showPersonal && showTable && picksNode) {
      return (
        <div className="flex w-full gap-2 gameweek-card-cta-split">
          <div className="flex flex-1 min-w-0">{picksNode}</div>
          {tableButton}
        </div>
      )
    }
    if (showTable) return tableButton
    if (showPersonal && picksNode) return picksNode
    return null
  }

  if (phase === 'UPCOMING') {
    return (
      <div
        className="w-full flex items-center justify-center min-h-[52px] rounded-[12px] border-2 border-amber-glow/50 bg-amber-glow/10 cursor-not-allowed"
        aria-disabled="true"
      >
        <span className="text-base font-black italic tracking-wide text-amber-glow/70">
          {t('comingSoon')}
        </span>
      </div>
    )
  }

  const personalKey = personalGameweekCtaMessageKey(phase, hasAnyPicks)
  const personalLabel = t(personalKey)

  if (phase === 'PICKS_LOCKED' || phase === 'LIVE') {
    const picksButton = (
      <Link
        href={picksHref}
        onClick={onClick}
        className={`${flexBtn} flex items-center justify-center ${CTA_MIN_H} rounded-[12px] border-2 border-cinnabar/50 bg-cinnabar/10 hover:bg-cinnabar/20 hover:border-cinnabar/70 transition-all duration-200 hover:scale-[1.01] active:scale-95 group`}
        aria-label={personalLabel}
      >
        <span className="font-black italic tracking-wide text-cinnabar transition-colors duration-200 group-hover:brightness-110 text-center px-1">
          {personalLabel}
        </span>
      </Link>
    )
    return layoutCTAs(showPersonal ? picksButton : null)
  }

  if (phase === 'FINAL' || phase === 'COMPLETED') {
    const picksButton = (
      <Link
        href={picksHref}
        onClick={onClick}
        className={`${flexBtn} flex items-center justify-center ${CTA_MIN_H} rounded-[12px] border-2 border-ivory/30 bg-ivory/5 hover:bg-ivory/10 hover:border-ivory/50 transition-all duration-200 hover:scale-[1.01] active:scale-95 group`}
        aria-label={personalLabel}
      >
        <span className="font-black italic tracking-wide text-ivory/70 group-hover:text-ivory transition-colors duration-200 text-center px-1">
          {personalLabel}
        </span>
      </Link>
    )
    return layoutCTAs(showPersonal ? picksButton : null)
  }

  const isCritical = urgencyLevel === 'critical'
  const isWarning = urgencyLevel === 'warning'

  const ctaBg = isCritical
    ? 'bg-cinnabar hover:brightness-110'
    : isWarning
      ? 'bg-amber-glow hover:brightness-105'
      : 'bg-lime-yellow hover:brightness-105'

  const ctaGlow = isCritical
    ? 'shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.7)]'
    : isWarning
      ? 'shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:shadow-[0_0_30px_rgba(251,191,36,0.6)]'
      : 'shadow-[0_0_20px_rgba(218,255,0,0.35)] hover:shadow-[0_0_32px_rgba(218,255,0,0.55)]'

  const picksButton = (
    <Link
      href={picksHref}
      onClick={onClick}
      className={`${flexBtn} flex items-center justify-center ${CTA_MIN_H} rounded-[12px] ${ctaBg} ${ctaGlow} transition-all duration-200 hover:scale-[1.02] active:scale-95 group`}
      aria-label={personalLabel}
    >
      <span className="font-black italic tracking-wide text-midnight-violet select-none text-center px-1">
        {personalLabel}
      </span>
    </Link>
  )
  return layoutCTAs(picksButton)
}

function gameweekNoteForPhase(
  t: (key: string) => string,
  phase: GameweekDisplayPhase,
  hasAnyPicks: boolean,
  playerCount: number
): string {
  const override = gameweekCardNoteOverrideKey(phase, hasAnyPicks, playerCount)
  if (override) return t(override)

  if (phase === 'OPEN' || phase === 'CLOSING_SOON') {
    return hasAnyPicks ? t('gameweekNoteHasPicks') : t('gameweekNoteNoPicks')
  }
  if (phase === 'PICKS_LOCKED') return t('gameweekNotePicksLocked')
  if (phase === 'LIVE') return t('gameweekNoteLive')
  if (phase === 'FINAL') return t('gameweekNoteFinal')
  if (phase === 'COMPLETED') return t('gameweekNoteCompleted')
  return t('gameweekNoteUpcoming')
}

export function GameweekCard({
  gameweek,
  playerCount,
  hasAnyPicks: hasAnyPicksProp,
  href,
  onTimerClick,
  isInteractive = true,
  showMatchPreviews = false,
  fixtureMatches,
  competition,
  showLeagueActions = false,
  pendingLeaveGameweekId,
  onLeagueMembershipChange,
}: GameweekCardProps) {
  const { locale } = useLanguage()
  const t = useTranslations('dashboard')
  const [leagueSheetOpen, setLeagueSheetOpen] = useState(false)
  const picksWindowOpen = isGameweekPicksWindowOpen(gameweek)

  const loadFixturesFromHook = showMatchPreviews && fixtureMatches === undefined
  const hookFixtures = useGameweekFixtures(gameweek.gameweekId, loadFixturesFromHook)
  const { matches, previews, slate } =
    fixtureMatches !== undefined
      ? fixturesStateFromMatches(fixtureMatches)
      : hookFixtures

  const headerLeagueBrand = useMemo(
    () => resolveCompetitionHeaderLeagueBrand(matches, competition),
    [matches, competition]
  )

  const usePhaseFromFixtures = showMatchPreviews || fixtureMatches !== undefined
  const picksLoadEnabled = isInteractive && showMatchPreviews && hasAnyPicksProp === undefined
  const picksFromHook = useGameweekHasPicks(gameweek.gameweekId, picksLoadEnabled)
  const picksKnown =
    hasAnyPicksProp !== undefined || !picksLoadEnabled || picksFromHook !== undefined
  const hasAnyPicks = hasAnyPicksProp ?? picksFromHook ?? false

  const { time, formatted: deadlineCountdown } = useCountdown(
    picksWindowOpen ? gameweek.deadline : null
  )
  const urgencyLevel = useMemo<UrgencyLevel>(() => {
    if (!time || time.isExpired || time.total <= 0) return 'expired'
    const mins = time.total / (1000 * 60)
    if (mins < 15) return 'critical'
    if (mins < 60) return 'warning'
    return 'normal'
  }, [time])

  const phase = useMemo<GameweekDisplayPhase>(() => {
    if (!usePhaseFromFixtures) {
      if (picksWindowOpen && (urgencyLevel === 'warning' || urgencyLevel === 'critical')) {
        return 'CLOSING_SOON'
      }
      return legacyPhaseFromStatus(gameweek.status)
    }
    return resolveGameweekDisplayPhase({
      dashboardStatus: gameweek.status,
      urgencyLevel,
      slate,
    })
  }, [
    usePhaseFromFixtures,
    picksWindowOpen,
    urgencyLevel,
    gameweek.status,
    slate,
  ])

  const brandingCopy = useMemo(
    () => ({
      flagshipTitle: t('gameweekBrandFlagshipTitle'),
      flagshipSubtitle: t('gameweekBrandFlagshipSubtitle'),
      leagueSubtitle: t('gameweekBrandLeagueSubtitle'),
      cupSubtitle: t('gameweekBrandCupSubtitle'),
      edition: (week: number) => t('gameweekBrandEdition', { week }),
    }),
    [t]
  )

  const presentGameweek = useMemo(
    () => (competition ? brandGameweekForCompetition(gameweek, competition, locale) : gameweek),
    [gameweek, competition, locale]
  )

  const branding = useMemo(
    () => resolveGameweekCardBranding(presentGameweek, brandingCopy),
    [presentGameweek, brandingCopy]
  )

  const phaseChrome = useMemo(
    () => resolveGameweekCardPhaseChrome(phase, urgencyLevel),
    [phase, urgencyLevel]
  )

  const noteMessage = gameweekNoteForPhase(t, phase, picksKnown ? hasAnyPicks : false, playerCount)

  const targetHref = href ?? `/picks/?id=${gameweek.gameweekId}`

  return (
    <div className="w-full gameweek-card-slot">
      <GameweekCardHeader
        branding={branding}
        shellClassName={phaseChrome.headerShell}
        headerClassName={phaseChrome.headerAnimation}
        leagueBrand={headerLeagueBrand}
        icon={branding.icon}
        onOpenLeagueActions={
          showLeagueActions && competition
            ? () => setLeagueSheetOpen(true)
            : undefined
        }
      />

      <div
        className={`${phaseChrome.bodyBorder} border-t-0 rounded-b-[10px] px-4 py-4 flex flex-col gap-3.5 bg-midnight-violet/50 backdrop-blur-sm transition-all duration-300 gameweek-card-body-slot`}
      >
        <GameweekCardMetaRow
          playerCount={playerCount}
          chrome={phaseChrome}
          statusBadge={
            <StatusBadge
              phase={phase}
              urgencyLevel={urgencyLevel}
              picksWindowOpen={picksWindowOpen}
              time={time}
              formatted={deadlineCountdown}
              compact
            />
          }
        />

        {showMatchPreviews && <GameweekMatchPreviewPills previews={previews} />}

        {isInteractive && picksKnown ? (
          <GameweekCardCTAs
            phase={phase}
            picksHref={targetHref}
            gameweekId={gameweek.gameweekId}
            onClick={onTimerClick}
            urgencyLevel={urgencyLevel}
            hasAnyPicks={hasAnyPicks}
            playerCount={playerCount}
          />
        ) : isInteractive ? (
          <div
            className={`w-full ${CTA_MIN_H} rounded-[12px] bg-ivory/5 border border-ivory/10 animate-pulse`}
            aria-busy="true"
            aria-label={t('gameweekPersonalLoading')}
          />
        ) : null}

        {pendingLeaveGameweekId === gameweek.gameweekId ? (
          <p className="text-center text-xs font-semibold text-amber-glow">{t('leavingAfterWeek')}</p>
        ) : null}

        <p className="text-center text-xs text-ivory/60 italic">{noteMessage}</p>
      </div>

      {competition && showLeagueActions ? (
        <LeagueActionsSheet
          isOpen={leagueSheetOpen}
          onClose={() => setLeagueSheetOpen(false)}
          competitionId={competition.competitionId}
          competitionName={competition.displayName}
          gameweekId={gameweek.gameweekId}
          picksHref={targetHref}
          onLeaveComplete={() => onLeagueMembershipChange?.()}
        />
      ) : null}
    </div>
  )
}