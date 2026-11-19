'use client'

import { Users } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { GameweekData } from '@/types/dashboard'
import { useCountdown } from '@/hooks/useCountdown'
import { useMemo } from 'react'

interface GameweekCardProps {
  gameweek: GameweekData
  playerCount: number
  /** When true, user has at least one prediction (saved or pending) for this week. Used for dynamic note. */
  hasAnyPicks?: boolean
  href?: string
  onTimerClick?: () => void
  /** When false (e.g. inside the picks-page sidebar) the CTA button is hidden. */
  isInteractive?: boolean
}

interface StatusBadgeProps {
  status: GameweekData['status']
  deadline?: Date
  urgencyLevel: 'normal' | 'warning' | 'critical' | 'expired'
}

interface CTAButtonProps {
  status: GameweekData['status']
  href: string
  onClick?: () => void
  urgencyLevel: 'normal' | 'warning' | 'critical' | 'expired'
  hasAnyPicks: boolean
}

const STATUS_LABEL_KEY: Record<
  GameweekData['status'],
  'gameweekStatusOpen' | 'gameweekStatusClosed' | 'gameweekStatusUpcoming' | 'gameweekStatusCompleted'
> = {
  OPEN: 'gameweekStatusOpen',
  CLOSED: 'gameweekStatusClosed',
  UPCOMING: 'gameweekStatusUpcoming',
  COMPLETED: 'gameweekStatusCompleted',
}

/** Compact pill — shows status label + live countdown only. No CTA. */
function StatusBadge({ status, deadline, urgencyLevel }: StatusBadgeProps) {
  const t = useTranslations('dashboard')
  const { time, formatted } = useCountdown(status === 'OPEN' ? deadline : null)

  const getBadgeColor = () => {
    if (status === 'OPEN' && urgencyLevel === 'critical') return 'bg-cinnabar text-midnight-violet'
    if (status === 'OPEN' && urgencyLevel === 'warning') return 'bg-amber-glow text-midnight-violet'
    switch (status) {
      case 'OPEN':
        return 'bg-lime-yellow/20 text-lime-yellow border border-lime-yellow/50'
      case 'CLOSED':
        return 'bg-cinnabar/20 text-cinnabar border border-cinnabar/40'
      case 'UPCOMING':
        return 'bg-amber-glow/20 text-amber-glow border border-amber-glow/40'
      case 'COMPLETED':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    }
  }

  const shouldPulse = status === 'OPEN' && (urgencyLevel === 'warning' || urgencyLevel === 'critical')
  const pulseClass = urgencyLevel === 'critical' ? 'animate-pulse' : 'animate-pulse-slow'

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold tracking-wide ${getBadgeColor()} ${shouldPulse ? pulseClass : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="font-black italic">{t(STATUS_LABEL_KEY[status])}</span>
      {status === 'OPEN' && deadline && time && !time.isExpired && (
        <>
          <span className="opacity-50">•</span>
          <span className="tabular-nums font-semibold">{formatted}</span>
        </>
      )}
    </div>
  )
}

/** Full-width CTA button — the primary action on the card. */
function CTAButton({ status, href, onClick, urgencyLevel, hasAnyPicks }: CTAButtonProps) {
  const t = useTranslations('dashboard')

  if (status === 'CLOSED') {
    return (
      <div
        className="w-full flex items-center justify-center min-h-[52px] rounded-[12px] bg-gray-700/50 border border-gray-600/40 cursor-not-allowed"
        aria-disabled="true"
      >
        <span className="text-base font-black italic tracking-wide text-gray-500">
          {t('weekClosed')}
        </span>
      </div>
    )
  }

  if (status === 'UPCOMING') {
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

  if (status === 'COMPLETED') {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="w-full flex items-center justify-center min-h-[52px] rounded-[12px] border-2 border-ivory/30 bg-ivory/5 hover:bg-ivory/10 hover:border-ivory/50 transition-all duration-200 hover:scale-[1.01] active:scale-95 group"
        aria-label="View results"
      >
        <span className="text-base font-black italic tracking-wide text-ivory/70 group-hover:text-ivory transition-colors duration-200">
          {t('viewResults')} →
        </span>
      </Link>
    )
  }

  // OPEN state — the hero CTA
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

export function GameweekCard({
  gameweek,
  playerCount,
  hasAnyPicks = false,
  href,
  onTimerClick,
  isInteractive = true,
}: GameweekCardProps) {
  const t = useTranslations('dashboard')
  const isOpen = gameweek.status === 'OPEN'

  // Compute urgency level here so both badge + CTA share it
  const { time } = useCountdown(isOpen ? gameweek.deadline : null)
  const urgencyLevel = useMemo<'normal' | 'warning' | 'critical' | 'expired'>(() => {
    if (!time || time.isExpired || time.total <= 0) return 'expired'
    const mins = time.total / (1000 * 60)
    if (mins < 15) return 'critical'
    if (mins < 60) return 'warning'
    return 'normal'
  }, [time])

  const headerClass = isOpen ? 'gameweek-card-header-glow' : 'gameweek-card-header-slot'

  const noteMessage =
    !isOpen
      ? t('gameweekNoteClosed')
      : hasAnyPicks
        ? t('gameweekNoteHasPicks')
        : t('gameweekNoteNoPicks')

  const targetHref = href ?? `/picks/?id=${gameweek.gameweekId}`

  // Border + card-level glow — stronger when open
  const cardBorderClass = isOpen
    ? 'border-2 border-lime-yellow shadow-[0_0_18px_rgba(218,255,0,0.22)] hover:shadow-[0_0_30px_rgba(218,255,0,0.38)]'
    : 'border border-lime-yellow/40'

  const usersColor = isOpen ? 'text-lime-yellow' : 'text-ivory/60'

  return (
    <div className="w-full gameweek-card-slot">
      {/* Header */}
      <div
        className={`bg-lime-yellow rounded-t-[10px] px-4 py-3 flex items-center justify-center shadow-sm ${headerClass}`}
      >
        <h2 className="text-2xl font-black italic tracking-widest text-midnight-violet text-center uppercase">
          {gameweek.name}
        </h2>
      </div>

      {/* Body */}
      <div
        className={`${cardBorderClass} border-t-0 rounded-b-[10px] px-4 py-5 flex flex-col gap-4 bg-midnight-violet/50 backdrop-blur-sm transition-all duration-300 gameweek-card-body-slot`}
      >
        {/* Player count */}
        <div className="flex items-center justify-center gap-2.5">
          <Users size={22} className={`${usersColor} transition-transform duration-200`} aria-hidden="true" />
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-ivory tabular-nums">{playerCount}</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-ivory/60">
              {t('playersJoined')}
            </span>
          </div>
        </div>

        {/* Status badge — compact timer only */}
        <div className="flex justify-center">
          <StatusBadge
            status={gameweek.status}
            deadline={gameweek.deadline}
            urgencyLevel={urgencyLevel}
          />
        </div>

        {/* CTA button — only shown when card is interactive */}
        {isInteractive && (
          <CTAButton
            status={gameweek.status}
            href={targetHref}
            onClick={onTimerClick}
            urgencyLevel={urgencyLevel}
            hasAnyPicks={hasAnyPicks}
          />
        )}

        {/* Dynamic note */}
        <p className="text-center text-xs text-ivory/60 italic">
          {noteMessage}
        </p>
      </div>
    </div>
  )
}
