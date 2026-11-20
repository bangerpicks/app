import type { GameweekData } from '@/types/dashboard'
import {
  inferWeekNumber,
  normalizeGameweekType,
  resolveGameweekCardBranding as resolveBranding,
} from '@/lib/gameweek-card-branding.mjs'

export type GameweekCardIcon = 'globe' | 'trophy' | 'medal'

export interface GameweekCardBranding {
  icon: GameweekCardIcon
  title: string
  subtitle: string
  edition: string | null
}

export interface GameweekCardBrandingCopy {
  flagshipTitle: string
  flagshipSubtitle: string
  leagueSubtitle: string
  cupSubtitle: string
  edition: (week: number) => string
}

export { inferWeekNumber, normalizeGameweekType }

export function resolveGameweekCardBranding(
  gameweek: Pick<GameweekData, 'name' | 'type' | 'description' | 'weekNumber'>,
  copy: GameweekCardBrandingCopy
): GameweekCardBranding {
  return resolveBranding(gameweek, copy)
}