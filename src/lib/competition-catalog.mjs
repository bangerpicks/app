/**
 * Map gameweeks to competition ids (legacy fallback before backfill).
 */

const DEFAULT_FLAGSHIP_ID = 'banger-world'

/**
 * @param {{ competitionId?: string, type?: string, gameweekId: string, name?: string }} gw
 * @returns {string}
 */
export function competitionIdForGameweek(gw) {
  if (gw.competitionId && String(gw.competitionId).trim()) {
    return String(gw.competitionId).trim()
  }
  if (gw.type === 'league') return `league-${gw.gameweekId}`
  if (gw.type === 'cup') return `cup-${gw.gameweekId}`
  return DEFAULT_FLAGSHIP_ID
}

/**
 * @param {Array<{ competitionId?: string, type?: string, gameweekId: string }>} all
 * @param {string} competitionId
 */
export function filterGameweeksForCompetition(all, competitionId) {
  return all.filter((gw) => competitionIdForGameweek(gw) === competitionId)
}

/**
 * @param {Array<{ competitionId?: string, type?: string, gameweekId: string, status?: string }>} all
 * @returns {string[]}
 */
export function listCompetitionIdsFromGameweeks(all) {
  const ids = new Set()
  for (const gw of all) {
    if (gw.status === 'draft') continue
    ids.add(competitionIdForGameweek(gw))
  }
  return [...ids]
}

/**
 * @param {Array<{ status?: string, startDate?: unknown }>} filtered
 */
export function pickCurrentGameweekForCompetition(filtered) {
  const active = filtered
    .filter((gw) => gw.status === 'active')
    .sort((a, b) => startMs(b.startDate) - startMs(a.startDate))
  if (active.length > 0) return active[0]

  const past = filtered
    .filter((gw) => gw.status === 'completed' || gw.status === 'archived')
    .sort((a, b) => startMs(b.startDate) - startMs(a.startDate))
  if (past.length > 0) return past[0]

  return null
}

/**
 * @param {Array<{ gameweekId: string, name: string, status?: string, startDate?: unknown }>} filtered
 * @param {string | null} currentGameweekId
 * @param {number} [limit]
 */
export function listPastGameweeksForCompetition(filtered, currentGameweekId, limit = 10) {
  return filtered
    .filter(
      (gw) =>
        (gw.status === 'completed' || gw.status === 'archived') &&
        gw.gameweekId !== currentGameweekId
    )
    .sort((a, b) => startMs(b.startDate) - startMs(a.startDate))
    .slice(0, limit)
    .map((gw) => ({ gameweekId: gw.gameweekId, name: gw.name }))
}

function startMs(ts) {
  if (!ts) return 0
  if (typeof ts.toDate === 'function') return ts.toDate().getTime()
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts === 'string') return new Date(ts).getTime() || 0
  if (typeof ts === 'object' && typeof ts.seconds === 'number') return ts.seconds * 1000
  return 0
}

/**
 * @param {'banger-world' | 'league' | 'cup'} trackId
 * @param {Array<{ type?: string, gameweekId: string, competitionId?: string }>} all
 */
export function defaultCompetitionIdForLegacyTrack(trackId, all) {
  if (trackId === 'banger-world') return DEFAULT_FLAGSHIP_ID
  for (const gw of all) {
    if (gw.status === 'draft') continue
    if (trackId === 'league' && gw.type === 'league') {
      return competitionIdForGameweek(gw)
    }
    if (trackId === 'cup' && gw.type === 'cup') {
      return competitionIdForGameweek(gw)
    }
  }
  return DEFAULT_FLAGSHIP_ID
}

/**
 * @param {string[]} ids
 */
export function pickDefaultCompetitionId(ids) {
  if (ids.length === 0) return null
  if (ids.includes(DEFAULT_FLAGSHIP_ID)) return DEFAULT_FLAGSHIP_ID
  return ids[0]
}

/**
 * Public, active competition with no live round yet but a scheduled opensAt.
 * @param {{ status?: string, visibility?: string, activeGameweekId?: string | null, opensAt?: unknown }} comp
 */
export function isCompetitionComingSoon(comp) {
  if (!comp) return false
  if (comp.status !== 'active' || comp.visibility !== 'public') return false
  if (comp.activeGameweekId) return false
  return startMs(comp.opensAt) > 0
}

/**
 * Countdown to opensAt, rounded up to the minute. Returns null once opensAt has passed.
 * @param {number} opensAtMs
 * @param {number} nowMs
 * @returns {{ days: number, hours: number, minutes: number } | null}
 */
export function comingSoonCountdown(opensAtMs, nowMs) {
  const diff = opensAtMs - nowMs
  if (!Number.isFinite(diff) || diff <= 0) return null
  const totalMinutes = Math.ceil(diff / 60000)
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  }
}

/**
 * Compact "2d 4h 12m" label (same units in en and es-MX).
 * @param {{ days: number, hours: number, minutes: number }} parts
 */
export function formatComingSoonCountdown(parts) {
  const out = []
  if (parts.days > 0) out.push(`${parts.days}d`)
  if (parts.days > 0 || parts.hours > 0) out.push(`${parts.hours}h`)
  out.push(`${parts.minutes}m`)
  return out.join(' ')
}

/** @param {unknown} ts */
export function timestampToMs(ts) {
  return startMs(ts)
}

export { DEFAULT_FLAGSHIP_ID }