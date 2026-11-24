import type { GameweekData } from '@/types/dashboard'
import type { CompetitionDocument } from '@/types/competition'
import {
  brandGameweekForCompetition as brandGameweekForCompetitionMjs,
  resolveCompetitionCardSubtitle as resolveCompetitionCardSubtitleMjs,
  resolveCompetitionDisplayName as resolveCompetitionDisplayNameMjs,
} from '@/lib/competition-display.mjs'

export function resolveCompetitionDisplayName(
  competition: CompetitionDocument,
  locale: string
): string {
  return resolveCompetitionDisplayNameMjs(competition, locale)
}

export function resolveCompetitionCardSubtitle(
  competition: CompetitionDocument,
  gameweek: Pick<GameweekData, 'description'>,
  locale: string
): string | undefined {
  return resolveCompetitionCardSubtitleMjs(competition, gameweek, locale)
}

export function brandGameweekForCompetition(
  gameweek: GameweekData,
  competition: CompetitionDocument,
  locale: string
): GameweekData {
  return brandGameweekForCompetitionMjs(gameweek, competition, locale) as GameweekData
}