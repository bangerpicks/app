/**
 * Optimistic picks save helpers (v1.2.11). Pure, shared by PicksClient and unit tests.
 */

/**
 * After a save resolves, drop only the pending picks that were actually sent with
 * the same value. Taps made while the save was in flight stay pending and are
 * auto-saved next.
 *
 * @template T
 * @param {Map<number, T>} pending
 * @param {Map<number, T>} sent
 * @returns {Map<number, T>}
 */
export function reconcilePendingAfterSave(pending, sent) {
  const next = new Map()
  for (const [fixtureId, pick] of pending) {
    if (sent.get(fixtureId) !== pick) next.set(fixtureId, pick)
  }
  return next
}

/**
 * Saved picks to display: what the page loaded, overlaid with picks confirmed by
 * the server in this session (so a live-score refresh of `matches` can't roll the
 * card back to stale picks).
 *
 * @template T
 * @param {Array<{ fixtureId: number, userPrediction?: T | null }>} matches
 * @param {Map<number, T>} confirmed
 * @returns {Map<number, T>}
 */
export function mergeSavedPredictions(matches, confirmed) {
  const saved = new Map()
  for (const match of matches) {
    if (match.userPrediction) saved.set(match.fixtureId, match.userPrediction)
  }
  const ids = new Set(matches.map((m) => m.fixtureId))
  for (const [fixtureId, pick] of confirmed) {
    if (ids.has(fixtureId)) saved.set(fixtureId, pick)
  }
  return saved
}

/**
 * Map a saveGameweekPicks failure to a translated message key (dashboard namespace).
 *
 * @param {{ code?: string, message?: string, name?: string } | null | undefined} error
 * @returns {'gameweekClosed' | 'saveErrorMatchStarted' | 'saveErrorCardOutdated' | 'saveRequiresAllPicks' | 'saveErrorMaintenance' | 'saveErrorSignIn' | 'saveErrorInviteOnly' | 'saveErrorGeneric'}
 */
export function savePicksErrorKey(error) {
  if (error?.name === 'RegistrationClosedError' || error?.message === 'REGISTRATION_CLOSED') {
    return 'saveErrorInviteOnly'
  }
  const code = String(error?.code || '').replace(/^functions\//, '')
  const message = String(error?.message || '')
  if (code === 'unauthenticated' || code === 'permission-denied') return 'saveErrorSignIn'
  if (code === 'failed-precondition') {
    if (/maintenance/i.test(message)) return 'saveErrorMaintenance'
    if (/fixture \d+|already scored|another gameweek/i.test(message)) return 'saveErrorMatchStarted'
    if (/closed|no fixtures/i.test(message)) return 'gameweekClosed'
    return 'saveErrorGeneric'
  }
  if (code === 'invalid-argument') {
    if (/must have a pick/i.test(message)) return 'saveRequiresAllPicks'
    return 'saveErrorCardOutdated'
  }
  if (code === 'not-found') return 'saveErrorCardOutdated'
  return 'saveErrorGeneric'
}
