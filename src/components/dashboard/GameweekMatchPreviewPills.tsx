'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useLanguage } from '@/lib/LanguageProvider'
import { formatMatchPreviewKickoffOrWeekday } from '@/lib/locale-format'
import type { MatchCardData, Prediction } from '@/types/dashboard'
import {
  isMatchFinished,
  isMatchInPlay,
  pickCorrectnessForMatch,
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

const PICK_INITIALS: Prediction[] = ['H', 'D', 'A']

function PickInitials({ prediction }: { prediction: Prediction | null | undefined }) {
  return (
    <div
      className="grid grid-cols-3 w-full px-0.5 text-[9px] font-black leading-none tracking-tight"
      aria-hidden
    >
      {PICK_INITIALS.map((pos) => (
        <span
          key={pos}
          className={`text-center ${
            prediction === pos ? 'text-lime-yellow' : 'text-ivory/25'
          }`}
        >
          {pos}
        </span>
      ))}
    </div>
  )
}

function MatchPreviewPill({ match }: { match: MatchCardData }) {
  const { locale } = useLanguage()
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
    suffix = formatMatchPreviewKickoffOrWeekday(match.date, locale)
  }

  const pickResult =
    finished && match.userPrediction
      ? pickCorrectnessForMatch(match, match.userPrediction)
      : null

  const resultOutline =
    pickResult === true
      ? 'ring-2 ring-lime-yellow/70 border-lime-yellow/40 bg-lime-yellow/12'
      : pickResult === false
        ? 'ring-2 ring-cinnabar/70 border-cinnabar/40 bg-cinnabar/12'
        : 'border border-ivory/15 bg-midnight-violet/80'

  const scoreSlot = showScore ? (
    <span className="flex items-center gap-0.5 text-[10px] font-bold tabular-nums leading-none shrink-0">
      <span>{homeScore}</span>
      <span className="text-ivory/45 font-medium">-</span>
      <span>{awayScore}</span>
    </span>
  ) : (
    <span className="text-[10px] text-ivory/45 font-medium leading-none shrink-0" aria-hidden>
      -
    </span>
  )

  return (
    <div
      className={`flex flex-col items-center gap-1 min-w-[4.75rem] w-max py-1.5 px-2 rounded-lg text-ivory ${resultOutline}`}
      title={`${match.homeTeam.name} vs ${match.awayTeam.name}`}
    >
      <div className="flex items-center justify-center gap-1 w-full">
        <TeamLogo src={match.homeTeam.logo} alt={match.homeTeam.name} />
        {scoreSlot}
        <TeamLogo src={match.awayTeam.logo} alt={match.awayTeam.name} />
      </div>
      {suffix ? (
        <span
          className={`text-[10px] font-semibold tabular-nums leading-none whitespace-nowrap ${
            inPlay ? 'text-cinnabar font-black' : 'text-ivory/65'
          }`}
        >
          {suffix}
        </span>
      ) : null}
      <PickInitials prediction={match.userPrediction} />
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
        <li key={match.fixtureId} className="flex-shrink-0">
          <MatchPreviewPill match={match} />
        </li>
      ))}
    </ul>
  )
}