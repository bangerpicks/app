'use client'

import { useLocale } from 'next-intl'
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
  const locale = useLocale()
  const title =
    locale === 'es-MX' && competition.displayName_esMX
      ? competition.displayName_esMX
      : competition.displayName

  const brandedGameweek: GameweekData = {
    ...gameweek,
    name: title,
  }

  return (
    <GameweekCard
      gameweek={brandedGameweek}
      playerCount={playerCount}
      href={`/picks/?id=${gameweek.gameweekId}`}
      isInteractive
      showMatchPreviews
    />
  )
}