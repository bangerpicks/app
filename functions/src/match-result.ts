import type { APIFootballFixture } from './api-football-types'

export type MatchOutcome = 'H' | 'D' | 'A'
export type RegulationScore = { home: number; away: number }

/** Statuses where the match is over and picks can be scored. */
const SCORABLE_STATUSES = new Set(['FT', 'AET', 'PEN'])
/** Statuses still inside regulation time, where `goals` equals the 90-minute score so far. */
const REGULATION_STATUSES = new Set(['1H', 'HT', '2H', 'FT'])

function isScore(home: unknown, away: unknown): boolean {
  return typeof home === 'number' && typeof away === 'number'
}

/**
 * The 90-minute score (regulation + stoppage time). Extra time and penalties never count.
 *
 * - Prefer `score.fulltime` (API-Football's end-of-regulation score).
 * - If `score.fulltime` is missing, fall back to `goals` only while the match is
 *   still in regulation (1H/HT/2H) or ended in regulation (FT); there `goals` cannot include extra time.
 * - For AET/PEN (and ET/BT/P), `goals` includes extra-time goals, so return null
 *   instead of guessing; scoring retries on the next run.
 */
export function getRegulationScore(fixture: APIFootballFixture): RegulationScore | null {
  const fulltime = fixture.score?.fulltime
  if (fulltime && isScore(fulltime.home, fulltime.away)) {
    return { home: fulltime.home as number, away: fulltime.away as number }
  }
  const status = fixture.fixture?.status?.short
  const goals = fixture.goals
  if (status && REGULATION_STATUSES.has(status) && goals && isScore(goals.home, goals.away)) {
    return { home: goals.home as number, away: goals.away as number }
  }
  return null
}

/**
 * The 1X2 outcome used for scoring: the 90-minute result.
 * Returns null when the match is not finished (FT/AET/PEN) or the 90-minute score is not available yet.
 * Postponed, cancelled, abandoned and similar statuses return null, as before.
 */
export function determineMatchWinner(fixture: APIFootballFixture): MatchOutcome | null {
  const status = fixture.fixture?.status?.short
  if (!status || !SCORABLE_STATUSES.has(status)) {
    return null
  }
  const score = getRegulationScore(fixture)
  if (!score) {
    return null
  }
  if (score.home > score.away) return 'H'
  if (score.home < score.away) return 'A'
  return 'D'
}
