import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { Globe, Medal, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import type { GameweekCardBranding, GameweekCardIcon } from '@/lib/gameweek-card-branding'
import type { CompetitionLeagueBrand } from '@/lib/competition-league-brand'
import { CompetitionCardHeaderMark } from './CompetitionCardHeaderMark'

const CARD_ICONS: Record<GameweekCardIcon, typeof Globe> = {
  globe: Globe,
  trophy: Trophy,
  medal: Medal,
}

export interface GameweekCardHeaderProps {
  branding: Pick<GameweekCardBranding, 'title' | 'subtitle' | 'edition'>
  /** Background + default text (phase chrome). */
  shellClassName?: string
  headerClassName?: string
  leagueBrand: CompetitionLeagueBrand | null
  icon: GameweekCardIcon
  /** Overrides the type icon (e.g. hourglass on coming-soon). */
  markFallback?: ReactNode
  headingLevel?: 'h2' | 'h3'
  onOpenLeagueActions?: () => void
}

/** Shared header shell for dashboard gameweek / competition cards. */
export function GameweekCardHeader({
  branding,
  shellClassName = 'bg-lime-yellow text-midnight-violet',
  headerClassName = 'gameweek-card-header-slot',
  leagueBrand,
  icon,
  markFallback,
  headingLevel = 'h2',
  onOpenLeagueActions,
}: GameweekCardHeaderProps) {
  const HeaderIcon = CARD_ICONS[icon]
  const fallback =
    markFallback ?? <HeaderIcon className="h-6 w-6 text-current" strokeWidth={2.25} />
  const Heading = headingLevel

  return (
    <div
      className={`rounded-t-[10px] px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3 shadow-sm ${shellClassName} ${headerClassName}`}
    >
      <CompetitionCardHeaderMark leagueBrand={leagueBrand} fallback={fallback} />
      <div className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Heading className="text-base sm:text-lg font-black leading-tight text-inherit">
            {branding.title}
          </Heading>
          {branding.edition ? (
            <span className="text-[11px] font-bold uppercase tracking-wide opacity-70">
              {branding.edition}
            </span>
          ) : null}
        </div>
        {branding.subtitle ? (
          <p className="mt-0.5 text-xs sm:text-sm font-medium leading-snug opacity-85 line-clamp-1">
            {branding.subtitle}
          </p>
        ) : null}
      </div>
      {onOpenLeagueActions ? (
        <button
          type="button"
          className="shrink-0 rounded-lg p-2 text-current opacity-80 hover:opacity-100 hover:bg-black/10 transition-opacity"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onOpenLeagueActions()
          }}
          aria-label="League options"
        >
          <Cog6ToothIcon className="h-6 w-6" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )
}