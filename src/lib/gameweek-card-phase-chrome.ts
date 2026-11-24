import type { GameweekDisplayPhase, UrgencyLevel } from '@/lib/gameweek-display-phase'
import { resolveGameweekCardPhaseChrome as resolveMjs } from '@/lib/gameweek-card-phase-chrome.mjs'

export type GameweekCardPhaseChrome = {
  headerShell: string
  headerAnimation: string
  bodyBorder: string
  usersIcon: string
  metaRow: string
  playersCount: string
  playersLabel: string
}

export function resolveGameweekCardPhaseChrome(
  phase: GameweekDisplayPhase,
  urgencyLevel: UrgencyLevel = 'normal'
): GameweekCardPhaseChrome {
  return resolveMjs(phase, urgencyLevel) as GameweekCardPhaseChrome
}