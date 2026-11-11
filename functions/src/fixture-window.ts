/** Match statuses that indicate the match is finished */
export const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN'])

export const PRE_KICKOFF_WINDOW_MS = 15 * 60 * 1000
export const POST_MATCH_WINDOW_MS = 3 * 60 * 60 * 1000

export function isMatchFinished(status: string): boolean {
  return FINISHED_STATUSES.has(status)
}

export interface FixturePollContext {
  kickoffTimestampSec: number | null | undefined
  statusShort: string | null | undefined
  nowMs?: number
}

/**
 * Whether updateLiveFixtures should request fresh data from API-Football for this fixture.
 * Poll from kickoff-15min through kickoff+3h, and keep polling past that window if status is
 * still not terminal (fixes stale e.g. 2H months after kickoff).
 */
export function fixtureNeedsLiveApiPoll(ctx: FixturePollContext): boolean {
  const now = ctx.nowMs ?? Date.now()
  const status = ctx.statusShort ?? ''

  if (ctx.kickoffTimestampSec == null || ctx.kickoffTimestampSec <= 0) {
    if (!status) {
      return false
    }
    if (isMatchFinished(status)) {
      return false
    }
  }

  if (ctx.kickoffTimestampSec != null && ctx.kickoffTimestampSec > 0) {
    const kickoffMs = ctx.kickoffTimestampSec * 1000
    const windowStart = kickoffMs - PRE_KICKOFF_WINDOW_MS
    const windowEnd = kickoffMs + POST_MATCH_WINDOW_MS

    if (now < windowStart) {
      return false
    }

    if (isMatchFinished(status)) {
      return now <= windowEnd
    }

    if (now > windowEnd) {
      return true
    }

    return true
  }

  if (isMatchFinished(status)) {
    return false
  }
  return status !== 'NS' && status !== 'TBD' && status !== 'PST' && status !== 'CANC' && status !== 'ABD'
}

/**
 * Whether autoScoring should refresh this fixture from API-Football before awarding points.
 */
export function fixtureNeedsScoringApiPoll(ctx: FixturePollContext, hasUnawardedPredictions: boolean): boolean {
  if (!hasUnawardedPredictions) {
    return false
  }

  const status = ctx.statusShort ?? ''
  if (isMatchFinished(status)) {
    return true
  }

  const now = ctx.nowMs ?? Date.now()
  if (ctx.kickoffTimestampSec != null && ctx.kickoffTimestampSec > 0) {
    const kickoffMs = ctx.kickoffTimestampSec * 1000
    if (now > kickoffMs + POST_MATCH_WINDOW_MS) {
      return true
    }
  }

  return false
}

export function extractFixturePollContext(
  cachedFixture: { fixture?: { timestamp?: number; status?: { short?: string } } } | undefined,
  fallbackKickoffSec?: number | null
): FixturePollContext {
  const kickoff =
    cachedFixture?.fixture?.timestamp ??
    (fallbackKickoffSec != null && fallbackKickoffSec > 0 ? fallbackKickoffSec : null)
  const statusShort = cachedFixture?.fixture?.status?.short ?? null
  return { kickoffTimestampSec: kickoff, statusShort }
}
