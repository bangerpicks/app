import type { GameweekStatus } from '@/types/dashboard'
import { resolveGameweekDisplayPhase as resolvePhase } from '@/lib/gameweek-display-phase.mjs'
export {
  summarizeFixtureSlate,
  pickNextMatchPreviews,
} from '@/lib/gameweek-match-preview.mjs'

export type GameweekDisplayPhase =
  | 'UPCOMING'
  | 'OPEN'
  | 'CLOSING_SOON'
  | 'PICKS_LOCKED'
  | 'LIVE'
  | 'FINAL'
  | 'COMPLETED'

export type UrgencyLevel = 'normal' | 'warning' | 'critical' | 'expired'

export type FixtureSlateSummary = {
  hasLive: boolean
  allFinished: boolean
  hasUpcoming: boolean
  total: number
}

export function resolveGameweekDisplayPhase(input: {
  dashboardStatus: GameweekStatus
  urgencyLevel: UrgencyLevel
  slate: FixtureSlateSummary
}): GameweekDisplayPhase {
  return resolvePhase(input) as GameweekDisplayPhase
}