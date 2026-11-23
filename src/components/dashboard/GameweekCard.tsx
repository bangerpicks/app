'use client'

import { Globe, Medal, Trophy, Users } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { GameweekData, MatchCardData } from '@/types/dashboard'
import { useCountdown } from '@/hooks/useCountdown'
import { useMemo } from 'react'
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
import {
  resolveGameweekCardBranding,
  type GameweekCardIcon,
} from '@/lib/gameweek-card-branding'
import { isGameweekPicksWindowOpen } from '@/lib/gameweek-selection'

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
}

const CARD_ICONS: Record<
  GameweekCardIcon,
  typeof Globe
> = {
  globe: Globe,
  trophy: Trophy,
  medal: Medal,
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
  deadline?: Date
  urgencyLevel: UrgencyLevel
  picksWindowOpen: boolean
}

function StatusBadge({ phase, deadline, urgencyLevel, picksWindowOpen }: StatusBadgeProps) {
  const t = useTranslations('dashboard')
  const { time, formatted } = useCountdown(picksWindowOpen ? deadline : null)

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
    deadline &&
    time &&
    !time.isExpired

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold tracking-wide ${getBadgeColor()} ${shouldPulse ? pulseClass : ''} ${livePulse}`}
      role="status"
      aria-live="polite"
    >
      <span className="font-black italic">{t(PHASE_LABEL_KEY[phase])}</span>
      {showCountdown && (
        <>
          <span className="opacity-50">•</span>
          <span className="tabular-nums font-semibold">{formatted}</span>
        </>
      )}
    </div>
  )
}

interface CTAButtonProps {
  phase: GameweekDisplayPhase
  href: string
  onClick?: () => void
  urgencyLevel: UrgencyLevel
  hasAnyPicks: boolean
}

function CTAButton({ phase, href, onClick, urgencyLevel, hasAnyPicks }: CTAButtonProps) {
  const t = useTranslations('dashboard')

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

  if (phase === 'PICKS_LOCKED' || phase === 'LIVE') {
    const label = t('viewGameweek')
    return (
      <Link
        href={href}
        onClick={onClick}
        className="w-full flex items-center justify-center min-h-[52px] rounded-[12px] border-2 border-cinnabar/50 bg-cinnabar/10 hover:bg-cinnabar/20 hover:border-cinnabar/70 transition-all duration-200 hover:scale-[1.01] active:scale-95 group"
        aria-label={label}
      >
        <span className="text-base font-black italic tracking-wide text-cinnabar transition-colors duration-200 group-hover:brightness-110">
          {label} →
        </span>
      </Link>
    )
  }

  if (phase === 'FINAL' || phase === 'COMPLETED') {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="w-full flex items-center justify-center min-h-[52px] rounded-[12px] border-2 border-ivory/30 bg-ivory/5 hover:bg-ivory/10 hover:border-ivory/50 transition-all duration-200 hover:scale-[1.01] active:scale-95 group"
        aria-label={t('viewResults')}
      >
        <span className="text-base font-black italic tracking-wide text-ivory/70 group-hover:text-ivory transition-colors duration-200">
          {t('viewResults')} →
        </span>
      </Link>
    )
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

  const label = hasAnyPicks ? t('viewPicks') : t('makePicks')

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`w-full flex items-center justify-center min-h-[52px] rounded-[12px] ${ctaBg} ${ctaGlow} transition-all duration-200 hover:scale-[1.02] active:scale-95 group`}
      aria-label={`${label} — gameweek is open`}
    >
      <span className="text-lg font-black italic tracking-wide text-midnight-violet select-none">
        {label} →
      </span>
    </Link>
  )
}

function gameweekNoteForPhase(
  t: (key: string) => string,
  phase: GameweekDisplayPhase,
  hasAnyPicks: boolean
): string {
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
}: GameweekCardProps) {
  const t = useTranslations('dashboard')
  const picksWindowOpen = isGameweekPicksWindowOpen(gameweek)

  const loadFixturesFromHook = showMatchPreviews && fixtureMatches === undefined
  const hookFixtures = useGameweekFixtures(gameweek.gameweekId, loadFixturesFromHook)
  const { previews, slate } =
    fixtureMatches !== undefined
      ? fixturesStateFromMatches(fixtureMatches)
      : hookFixtures

  const usePhaseFromFixtures = showMatchPreviews || fixtureMatches !== undefined
  const picksFromHook = useGameweekHasPicks(
    gameweek.gameweekId,
    isInteractive && showMatchPreviews && hasAnyPicksProp === undefined
  )
  const hasAnyPicks = hasAnyPicksProp ?? picksFromHook ?? false

  const { time } = useCountdown(picksWindowOpen ? gameweek.deadline : null)
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

  const branding = useMemo(
    () =>
      resolveGameweekCardBranding(gameweek, {
        flagshipTitle: t('gameweekBrandFlagshipTitle'),
        flagshipSubtitle: t('gameweekBrandFlagshipSubtitle'),
        leagueSubtitle: t('gameweekBrandLeagueSubtitle'),
        cupSubtitle: t('gameweekBrandCupSubtitle'),
        edition: (week) => t('gameweekBrandEdition', { week }),
      }),
    [gameweek, t]
  )

  const HeaderIcon = CARD_ICONS[branding.icon]

  const isPickPhaseActive = phase === 'OPEN' || phase === 'CLOSING_SOON'
  const headerClass = isPickPhaseActive ? 'gameweek-card-header-glow' : 'gameweek-card-header-slot'

  const noteMessage = gameweekNoteForPhase(t, phase, hasAnyPicks)

  const targetHref = href ?? `/picks/?id=${gameweek.gameweekId}`

  let cardBorderClass = 'border border-lime-yellow/40'
  if (isPickPhaseActive) {
    cardBorderClass =
      'border-2 border-lime-yellow shadow-[0_0_18px_rgba(218,255,0,0.22)] hover:shadow-[0_0_30px_rgba(218,255,0,0.38)]'
  } else if (phase === 'LIVE') {
    cardBorderClass =
      'border-2 border-cinnabar/50 shadow-[0_0_14px_rgba(238,65,54,0.2)] hover:shadow-[0_0_22px_rgba(238,65,54,0.35)]'
  }

  const usersColor = isPickPhaseActive ? 'text-lime-yellow' : 'text-ivory/60'

  return (
    <div className="w-full gameweek-card-slot">
      <div
        className={`bg-lime-yellow rounded-t-[10px] px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3 shadow-sm ${headerClass}`}
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-midnight-violet/15 bg-midnight-violet/10"
          aria-hidden
        >
          <HeaderIcon className="h-6 w-6 text-midnight-violet" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="text-base sm:text-lg font-black leading-tight text-midnight-violet">
              {branding.title}
            </h2>
            {branding.edition ? (
              <span className="text-[11px] font-bold uppercase tracking-wide text-midnight-violet/65">
                {branding.edition}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs sm:text-sm font-medium leading-snug text-midnight-violet/80 line-clamp-2">
            {branding.subtitle}
          </p>
        </div>
      </div>

      <div
        className={`${cardBorderClass} border-t-0 rounded-b-[10px] px-4 py-5 flex flex-col gap-4 bg-midnight-violet/50 backdrop-blur-sm transition-all duration-300 gameweek-card-body-slot`}
      >
        <div className="flex items-center justify-center gap-2.5">
          <Users size={22} className={`${usersColor} transition-transform duration-200`} aria-hidden="true" />
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-ivory tabular-nums">{playerCount}</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-ivory/60">
              {t('playersJoined')}
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <StatusBadge
            phase={phase}
            deadline={gameweek.deadline}
            urgencyLevel={urgencyLevel}
            picksWindowOpen={picksWindowOpen}
          />
        </div>

        {showMatchPreviews && <GameweekMatchPreviewPills previews={previews} />}

        {isInteractive && (
          <CTAButton
            phase={phase}
            href={targetHref}
            onClick={onTimerClick}
            urgencyLevel={urgencyLevel}
            hasAnyPicks={hasAnyPicks}
          />
        )}

        <p className="text-center text-xs text-ivory/60 italic">{noteMessage}</p>
      </div>
    </div>
  )
}