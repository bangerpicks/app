'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { GameweekCard } from './GameweekCard'
import { CompetitionCard } from './CompetitionCard'
import { GameweekData } from '@/types/dashboard'
import type { CompetitionPlayCard } from '@/types/competition'
import { normalizeGameweekType } from '@/lib/gameweek-card-branding'

interface CompetitionsSectionProps {
  gameweeks?: GameweekData[]
  competitionCards?: CompetitionPlayCard[]
  gameweeksById?: Map<string, GameweekData>
  headingAs?: 'h1' | 'h2'
}

type GroupKey = 'flagship' | 'league' | 'cup'

const GROUP_ORDER: GroupKey[] = ['flagship', 'league', 'cup']

function groupKeyForGameweek(gw: GameweekData): GroupKey {
  const kind = normalizeGameweekType(gw.type)
  if (kind === 'league') return 'league'
  if (kind === 'cup') return 'cup'
  return 'flagship'
}

export function CompetitionsSection({
  gameweeks = [],
  competitionCards,
  gameweeksById,
  headingAs: HeadingTag = 'h2',
}: CompetitionsSectionProps) {
  const t = useTranslations('dashboard')

  const cardRows = useMemo(() => {
    if (!competitionCards?.length) return null
    return competitionCards
      .map((row) => {
        const gw =
          gameweeksById?.get(row.gameweekId) ??
          gameweeks.find((g) => g.gameweekId === row.gameweekId)
        if (!gw) return null
        return { competition: row.competition, gameweek: gw, playerCount: row.playerCount }
      })
      .filter(Boolean) as Array<{
      competition: CompetitionPlayCard['competition']
      gameweek: GameweekData
      playerCount: number
    }>
  }, [competitionCards, gameweeksById, gameweeks])

  const grouped = useMemo(() => {
    const buckets: Record<GroupKey, GameweekData[]> = {
      flagship: [],
      league: [],
      cup: [],
    }
    for (const gw of gameweeks) {
      buckets[groupKeyForGameweek(gw)].push(gw)
    }
    return buckets
  }, [gameweeks])

  const showGrouped =
    gameweeks.length >= 3 &&
    GROUP_ORDER.filter((k) => grouped[k].length > 0).length > 1

  const renderGrid = (items: GameweekData[]) => (
    <div
      className={`w-full grid gap-5 ${
        items.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-xl mx-auto'
      }`}
    >
      {items.map((gw) => (
        <div key={gw.gameweekId} className="w-full flex flex-col">
          <GameweekCard
            gameweek={gw}
            playerCount={gw.playerCount}
            href={`/picks/?id=${gw.gameweekId}`}
            isInteractive
            showMatchPreviews
          />
        </div>
      ))}
    </div>
  )

  const groupTitleKey: Record<GroupKey, string> = {
    flagship: 'competitionGroupFlagship',
    league: 'competitionGroupLeague',
    cup: 'competitionGroupCup',
  }

  return (
    <section className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-center sm:text-left">
        <HeadingTag className="text-xl sm:text-2xl font-black text-ivory tracking-wide">
          {t('availableCompetitions')}
        </HeadingTag>
        <p className="text-sm text-ivory/70">{t('availableCompetitionsSubtitle')}</p>
      </div>

      {cardRows && cardRows.length > 0 ? (
        <div
          className={`w-full grid gap-5 ${
            cardRows.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-xl mx-auto'
          }`}
        >
          {cardRows.map((row) => (
            <div key={row.competition.competitionId} className="w-full flex flex-col">
              <CompetitionCard
                competition={row.competition}
                gameweek={row.gameweek}
                playerCount={row.playerCount}
              />
            </div>
          ))}
        </div>
      ) : gameweeks.length === 0 ? (
        <div className="w-full p-8 rounded-xl bg-midnight-violet/60 border border-ivory/15 text-center">
          <p className="text-ivory/80 text-base">{t('noActiveCompetitions')}</p>
        </div>
      ) : showGrouped ? (
        <div className="w-full flex flex-col gap-8">
          {GROUP_ORDER.map((key) => {
            const items = grouped[key]
            if (items.length === 0) return null
            return (
              <div key={key} className="w-full flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-ivory/50">
                  {t(groupTitleKey[key])}
                </h3>
                {renderGrid(items)}
              </div>
            )
          })}
        </div>
      ) : (
        renderGrid(gameweeks)
      )}
    </section>
  )
}