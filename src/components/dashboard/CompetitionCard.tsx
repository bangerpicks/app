'use client'

import { GameweekCard } from './GameweekCard'
import type { GameweekData } from '@/types/dashboard'
import type { CompetitionDocument } from '@/types/competition'

interface CompetitionCardProps {
  competition: CompetitionDocument
  gameweek: GameweekData
  playerCount: number
}

export function CompetitionCard({
  competition,
  gameweek,
  playerCount,
}: CompetitionCardProps) {
  return (
    <GameweekCard
      gameweek={gameweek}
      competition={competition}
      playerCount={playerCount}
      href={`/picks/?id=${gameweek.gameweekId}`}
      isInteractive
      showMatchPreviews
    />
  )
}