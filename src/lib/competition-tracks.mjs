/**
 * Phase-1 competition tracks derived from gameweek.type (see ops/specs multi-competition).
 */

/** @typedef {'banger-world' | 'league' | 'cup'} CompetitionTrackId */

function isFlagshipGameweek(gw) {
  const t = gw.type
  if (!t || t === 'banger-week' || t === 'flagship') return true
  return false
}

export const COMPETITION_TRACK_ORDER = /** @type {const} */ ([
  'banger-world',
  'league',
  'cup',
])

/**
 * @param {{ type?: string }} gw
 * @returns {CompetitionTrackId}
 */
export function trackIdForGameweek(gw) {
  if (gw.type === 'league') return 'league'
  if (gw.type === 'cup') return 'cup'
  if (isFlagshipGameweek(gw)) return 'banger-world'
  return 'banger-world'
}

/**
 * @param {Array<{ status?: string, type?: string }>} all
 * @returns {CompetitionTrackId[]}
 */
export function listAvailableTracks(all) {
  const found = new Set()
  for (const gw of all) {
    if (gw.status === 'draft') continue
    found.add(trackIdForGameweek(gw))
  }
  return COMPETITION_TRACK_ORDER.filter((id) => found.has(id))
}

/**
 * @param {Array<{ type?: string }>} all
 * @param {CompetitionTrackId} trackId
 */
export function filterGameweeksForTrack(all, trackId) {
  return all.filter((gw) => trackIdForGameweek(gw) === trackId)
}

/**
 * @param {CompetitionTrackId[]} tracks
 * @returns {CompetitionTrackId | null}
 */
export function pickDefaultTrack(tracks) {
  if (tracks.length === 0) return null
  if (tracks.includes('banger-world')) return 'banger-world'
  return tracks[0]
}

/**
 * @param {unknown} ts
 * @returns {number}
 */
function startMs(ts) {
  if (!ts) return 0
  if (typeof ts.toDate === 'function') return ts.toDate().getTime()
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts === 'string') return new Date(ts).getTime()
  return 0
}

/**
 * @param {Array<{ status?: string, startDate?: unknown }>} filtered
 * @returns {typeof filtered[0] | null}
 */
export function pickCurrentGameweekForTrack(filtered) {
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
 * @param {Array<{ gameweekId: string, name: string, status?: string, type?: string, startDate?: unknown }>} filtered
 * @param {string | null} currentGameweekId
 * @param {number} [limit]
 */
export function listPastGameweeksForTrack(filtered, currentGameweekId, limit = 10) {
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

/**
 * @param {CompetitionTrackId} trackId
 * @returns {boolean}
 */
export function isFlagshipTrack(trackId) {
  return trackId === 'banger-world'
}