/** Minutes before first kickoff used when settings do not override. */
export const DEFAULT_LOCK_MINUTES_BEFORE_KICKOFF = 60

/** Missing type is treated as flagship (backward compatible). */
export function isFlagshipGameweek(gw: { type?: string }): boolean {
  const t = gw.type
  if (!t || t === 'banger-week' || t === 'flagship') {
    return true
  }
  return false
}

export function calculateLockFromFirstKickoff(
  fixtures: Array<{ fixture: { timestamp: number } }>,
  minutesBeforeKickoff: number = DEFAULT_LOCK_MINUTES_BEFORE_KICKOFF
): Date | null {
  if (fixtures.length === 0) {
    return null
  }
  const earliestKickoff = Math.min(...fixtures.map((f) => f.fixture.timestamp))
  return new Date((earliestKickoff - minutesBeforeKickoff * 60) * 1000)
}
