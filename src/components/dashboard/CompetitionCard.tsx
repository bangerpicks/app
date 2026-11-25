'use client'

import { useTranslations } from 'next-intl'
import { GameweekCard } from './GameweekCard'
import type { GameweekData } from '@/types/dashboard'
import type { CompetitionDocument } from '@/types/competition'

interface CompetitionCardProps {
  competition: CompetitionDocument
  gameweek: GameweekData
  playerCount: number
  showLeagueActions?: boolean
  pendingLeaveGameweekId?: string | null
  onLeagueMembershipChange?: () => void
  /** Discover: show join control instead of gear-only home card */
  discoverJoin?: {
    isMember: boolean
    onJoin: () => void
    joining?: boolean
  }
}

export function CompetitionCard({
  competition,
  gameweek,
  playerCount,
  showLeagueActions = false,
  pendingLeaveGameweekId,
  onLeagueMembershipChange,
  discoverJoin,
}: CompetitionCardProps) {
  const t = useTranslations('dashboard')
  return (
  <div className="flex flex-col gap-2 w-full">
    <GameweekCard
      gameweek={gameweek}
      competition={competition}
      playerCount={playerCount}
      href={`/picks/?id=${gameweek.gameweekId}`}
      isInteractive
      showMatchPreviews
      showLeagueActions={showLeagueActions}
      pendingLeaveGameweekId={pendingLeaveGameweekId}
      onLeagueMembershipChange={onLeagueMembershipChange}
    />
    {discoverJoin && !discoverJoin.isMember ? (
      <button
        type="button"
        disabled={discoverJoin.joining}
        onClick={discoverJoin.onJoin}
        className="w-full rounded-lg border border-lime-yellow/40 bg-lime-yellow/10 py-2.5 text-sm font-bold text-lime-yellow disabled:opacity-60"
      >
        {discoverJoin.joining ? '…' : t('addLeague')}
      </button>
    ) : null}
  </div>
  )
}