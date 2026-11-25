'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { GameweekCard } from './GameweekCard'
import { CompetitionCard } from './CompetitionCard'
import { ComingSoonCompetitionCard } from './ComingSoonCompetitionCard'
import { GameweekData } from '@/types/dashboard'
import type { CompetitionDocument, CompetitionPlayCard } from '@/types/competition'
import { normalizeGameweekType } from '@/lib/gameweek-card-branding'

interface CompetitionsSectionProps {
  gameweeks?: GameweekData[]
  competitionCards?: CompetitionPlayCard[]
  gameweeksById?: Map<string, GameweekData>
  comingSoonCompetitions?: CompetitionDocument[]
  headingAs?: 'h1' | 'h2'
  /** Hide “Active competitions” heading (signed-in home). */
  showSectionHeader?: boolean
  /** One grid for all tracks (no flagship/league/cup stacks). */
  flatGrid?: boolean
  showLeagueActions?: boolean
  onLeagueMembershipChange?: () => void
  /** Competition id to briefly highlight (after join). */
  highlightCompetitionId?: string | null
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
  comingSoonCompetitions = [],
  headingAs: HeadingTag = 'h2',
  showSectionHeader = true,
  flatGrid = false,
  showLeagueActions = false,
  onLeagueMembershipChange,
  highlightCompetitionId,
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
        return {
          competition: row.competition,
          gameweek: gw,
          playerCount: row.playerCount,
          pendingLeaveGameweekId: row.pendingLeaveGameweekId,
        }
      })
      .filter(Boolean) as Array<{
      competition: CompetitionPlayCard['competition']
      gameweek: GameweekData
      playerCount: number
      pendingLeaveGameweekId?: string | null
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

  const useGrouped = showGrouped && !flatGrid

  return (
    <section className="w-full flex flex-col gap-4">
      {showSectionHeader ? (
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <HeadingTag className="text-xl sm:text-2xl font-black text-ivory tracking-wide">
            {t('availableCompetitions')}
          </HeadingTag>
          <p className="text-sm text-ivory/70">{t('availableCompetitionsSubtitle')}</p>
        </div>
      ) : null}

      {(cardRows && cardRows.length > 0) || comingSoonCompetitions.length > 0 ? (
        <div
          className={`w-full grid gap-5 ${
            (cardRows?.length ?? 0) + comingSoonCompetitions.length > 1
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 max-w-xl mx-auto'
          }`}
        >
          {(cardRows ?? []).map((row) => (
            <div
              key={row.competition.competitionId}
              id={`competition-card-${row.competition.competitionId}`}
              className={`w-full flex flex-col rounded-xl transition-shadow duration-500 ${
                highlightCompetitionId === row.competition.competitionId
                  ? 'ring-2 ring-lime-yellow/80 shadow-[0_0_24px_rgba(212,255,63,0.25)]'
                  : ''
              }`}
            >
              <CompetitionCard
                competition={row.competition}
                gameweek={row.gameweek}
                playerCount={row.playerCount}
                showLeagueActions={showLeagueActions}
                pendingLeaveGameweekId={row.pendingLeaveGameweekId}
                onLeagueMembershipChange={onLeagueMembershipChange}
              />
            </div>
          ))}
          {comingSoonCompetitions.map((comp) => (
            <div key={comp.competitionId} className="w-full flex flex-col">
              <ComingSoonCompetitionCard competition={comp} />
            </div>
          ))}
        </div>
      ) : gameweeks.length === 0 ? (
        <div className="w-full p-8 rounded-xl bg-midnight-violet/60 border border-ivory/15 text-center">
          <p className="text-ivory/80 text-base">{t('noActiveCompetitions')}</p>
        </div>
      ) : useGrouped ? (
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