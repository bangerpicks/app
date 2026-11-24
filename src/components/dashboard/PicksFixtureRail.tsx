'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { MatchCardData, Prediction } from '@/types/dashboard'

interface PicksFixtureRailProps {
  matches: MatchCardData[]
  activeFixtureId: number | null
  getPrediction: (fixtureId: number) => Prediction | null
  onSelect: (fixtureId: number) => void
  disabled?: boolean
}

function TeamLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={20}
          height={20}
          loading="lazy"
          className="object-contain w-full h-full"
        />
      ) : (
        <span className="block w-full h-full rounded-sm bg-midnight-violet/15" aria-hidden />
      )}
    </div>
  )
}

const PICK_INITIALS: Prediction[] = ['H', 'D', 'A']

function PickInitials({ prediction }: { prediction: Prediction | null }) {
  return (
    <div
      className="grid grid-cols-3 w-full px-0.5 text-[9px] font-black leading-none tracking-tight"
      aria-hidden
    >
      {PICK_INITIALS.map((pos) => (
        <span
          key={pos}
          className={`text-center ${
            prediction === pos ? 'text-midnight-violet' : 'text-midnight-violet/25'
          }`}
        >
          {pos}
        </span>
      ))}
    </div>
  )
}

function FixtureRailCell({
  match,
  prediction,
  isActive,
  onSelect,
  disabled,
  buttonRef,
}: {
  match: MatchCardData
  prediction: Prediction | null
  isActive: boolean
  onSelect: () => void
  disabled?: boolean
  buttonRef?: (el: HTMLButtonElement | null) => void
}) {
  return (
    <li className="flex-shrink-0 snap-center">
      <button
        type="button"
        ref={buttonRef}
        onClick={onSelect}
        disabled={disabled}
        aria-current={isActive ? 'step' : undefined}
        className={`
          flex flex-col items-center gap-1 w-[52px] py-1.5 px-1 rounded-lg bg-ivory
          transition-transform duration-150
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-yellow
          ${isActive ? 'ring-2 ring-lime-yellow scale-[1.04]' : 'ring-1 ring-midnight-violet/10'}
          ${disabled ? 'opacity-60 cursor-default' : 'hover:ring-lime-yellow/60 active:scale-95 cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-0.5">
          <TeamLogo src={match.homeTeam.logo} alt={match.homeTeam.name} />
          <TeamLogo src={match.awayTeam.logo} alt={match.awayTeam.name} />
        </div>
        <PickInitials prediction={prediction} />
      </button>
    </li>
  )
}

export function PicksFixtureRail({
  matches,
  activeFixtureId,
  getPrediction,
  onSelect,
  disabled = false,
}: PicksFixtureRailProps) {
  const t = useTranslations('picks')
  const activeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeFixtureId])

  if (matches.length === 0) return null

  return (
    <div className="w-full min-w-0 -mx-1">
      <ul
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory list-none p-0 m-0 pb-0.5"
        aria-label={t('fixtureRailLabel')}
      >
        {matches.map((match) => {
          const isActive = match.fixtureId === activeFixtureId
          return (
            <FixtureRailCell
              key={match.fixtureId}
              match={match}
              prediction={getPrediction(match.fixtureId)}
              isActive={isActive}
              disabled={disabled}
              onSelect={() => onSelect(match.fixtureId)}
              buttonRef={isActive ? (el) => { activeRef.current = el } : undefined}
            />
          )
        })}
      </ul>
    </div>
  )
}