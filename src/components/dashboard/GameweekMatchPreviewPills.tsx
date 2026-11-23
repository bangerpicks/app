'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { MatchCardData } from '@/types/dashboard'
import {
  isMatchFinished,
  isMatchInPlay,
} from '@/lib/gameweek-match-preview.mjs'

function TeamLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={16}
          height={16}
          loading="lazy"
          className="object-contain w-full h-full"
        />
      ) : (
        <span className="block w-full h-full rounded-sm bg-ivory/15" aria-hidden />
      )}
    </div>
  )
}

function MatchPreviewPill({ match }: { match: MatchCardData }) {
  const inPlay = isMatchInPlay(match.matchStatus)
  const finished = isMatchFinished(match.matchStatus)
  const showScore = inPlay || finished
  const homeScore = match.score?.home ?? (showScore ? 0 : null)
  const awayScore = match.score?.away ?? (showScore ? 0 : null)

  let suffix: string | null = null
  if (inPlay) {
    if (match.matchStatus === 'HT') {
      suffix = 'HT'
    } else if (match.minute != null) {
      suffix = `${match.minute}${match.stoppageTime ? `+${match.stoppageTime}` : ''}'`
    }
  } else if (finished) {
    suffix = 'FT'
  } else {
    suffix = match.time
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-midnight-violet/80 border border-ivory/15 text-ivory max-w-full">
      <TeamLogo src={match.homeTeam.logo} alt={match.homeTeam.name} />
      {showScore ? (
        <span className="flex items-center gap-0.5 text-[10px] font-bold tabular-nums leading-none">
          <span>{homeScore}</span>
          <span className="text-ivory/45 font-medium">-</span>
          <span>{awayScore}</span>
        </span>
      ) : (
        <span className="text-[10px] text-ivory/45 font-medium leading-none">-</span>
      )}
      <TeamLogo src={match.awayTeam.logo} alt={match.awayTeam.name} />
      {suffix ? (
        <span
          className={`text-[10px] font-semibold tabular-nums leading-none whitespace-nowrap ${
            inPlay ? 'text-cinnabar font-black' : 'text-ivory/65'
          }`}
        >
          {suffix}
        </span>
      ) : null}
    </div>
  )
}

interface GameweekMatchPreviewPillsProps {
  previews: MatchCardData[]
}

export function GameweekMatchPreviewPills({ previews }: GameweekMatchPreviewPillsProps) {
  const t = useTranslations('dashboard')

  if (previews.length === 0) return null

  return (
    <ul
      className="flex flex-wrap justify-center gap-1.5 list-none p-0 m-0"
      aria-label={t('gameweekMatchPreviewLabel')}
    >
      {previews.map((match) => (
        <li key={match.fixtureId}>
          <MatchPreviewPill match={match} />
        </li>
      ))}
    </ul>
  )
}