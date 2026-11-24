'use client'

import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { RankingView, GameweekRankingData, PastGameweekOption } from '@/types/dashboard'
import { pickPluralKey } from '@/lib/i18n-plural.mjs'
import { weekNavigationState } from '@/lib/rankings-week-nav.mjs'

const VIEWS: RankingView[] = ['this-week', 'season', 'hall-of-fame']

const VIEW_LABEL_KEY: Record<RankingView, string> = {
  'this-week': 'thisWeek',
  season: 'season',
  'hall-of-fame': 'hallOfFame',
}

interface RankingsViewToolbarProps {
  activeView: RankingView
  onChangeView: (view: RankingView) => void
  gameweekData?: GameweekRankingData
  navigableWeeks: PastGameweekOption[]
  selectedGameweekId?: string | null
  onSelectGameweek?: (gameweekId: string | null) => void
  className?: string
}

export function RankingsViewToolbar({
  activeView,
  onChangeView,
  gameweekData,
  navigableWeeks,
  selectedGameweekId = null,
  onSelectGameweek,
  className = '',
}: RankingsViewToolbarProps) {
  const t = useTranslations('rankings')

  const activeWeekId = selectedGameweekId ?? gameweekData?.gameweek.gameweekId ?? null
  const selectedWeekIndex =
    activeWeekId != null
      ? navigableWeeks.findIndex((gw) => gw.gameweekId === activeWeekId)
      : -1
  const weekNav = weekNavigationState(selectedWeekIndex, navigableWeeks.length)
  const showWeekStrip = activeView === 'this-week' && Boolean(gameweekData)
  const showWeekNav = navigableWeeks.length > 1 && onSelectGameweek

  const playerCountLine =
    gameweekData != null
      ? t(
          pickPluralKey(
            gameweekData.gameweek.playerCount,
            'playerCountOne',
            'playerCountMany'
          ),
          { count: gameweekData.gameweek.playerCount }
        )
      : null

  return (
    <div
      className={`rankings-view-toolbar w-full max-w-2xl lg:max-w-4xl shrink-0 overflow-hidden rounded-xl border border-ivory/15 bg-ivory/[0.06] ${className}`}
    >
      <div
        className="rankings-view-tabs flex gap-1 p-1"
        role="tablist"
        aria-label={t('title')}
      >
        {VIEWS.map((view) => {
          const selected = activeView === view
          return (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChangeView(view)}
              className={`flex-1 rounded-lg py-2 px-1.5 sm:px-2 font-semibold text-[11px] sm:text-xs leading-tight transition-colors ${
                selected
                  ? 'bg-lime-yellow text-midnight-violet shadow-sm'
                  : 'text-ivory/65 hover:bg-ivory/10 hover:text-ivory/90'
              }`}
            >
              {t(VIEW_LABEL_KEY[view])}
            </button>
          )
        })}
      </div>

      {showWeekStrip && gameweekData ? (
        <div className="rankings-week-strip flex items-center gap-0.5 border-t border-midnight-violet/10 bg-lime-yellow px-1.5 py-1.5 sm:px-2 sm:py-2">
          {showWeekNav ? (
            <button
              type="button"
              disabled={!weekNav.canGoToOlderWeek}
              onClick={() => {
                if (weekNav.canGoToOlderWeek && weekNav.olderWeekIndex != null) {
                  onSelectGameweek!(navigableWeeks[weekNav.olderWeekIndex].gameweekId)
                }
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-midnight-violet transition-colors hover:bg-midnight-violet/10 disabled:opacity-30"
              aria-label={t('previousWeek')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-8 shrink-0" aria-hidden />
          )}

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold leading-snug text-midnight-violet sm:text-[15px]">
              <span>{gameweekData.gameweek.name}</span>
              {playerCountLine ? (
                <span className="font-semibold text-midnight-violet/75">
                  {' · '}
                  {playerCountLine}
                </span>
              ) : null}
            </p>
          </div>

          {showWeekNav ? (
            <button
              type="button"
              disabled={!weekNav.canGoToNewerWeek}
              onClick={() => {
                if (weekNav.canGoToNewerWeek && weekNav.newerWeekIndex != null) {
                  onSelectGameweek!(navigableWeeks[weekNav.newerWeekIndex].gameweekId)
                }
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-midnight-violet transition-colors hover:bg-midnight-violet/10 disabled:opacity-30"
              aria-label={t('nextWeek')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-8 shrink-0" aria-hidden />
          )}
        </div>
      ) : null}
    </div>
  )
}