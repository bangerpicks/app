/**
 * Pure helpers for dashboard player count display (unit-tested; keep in sync with UI).
 */

/**
 * After a successful first-time join save, bump the displayed count locally.
 * @param {number} current
 * @returns {number}
 */
export function playerCountAfterFirstJoinSave(current) {
  if (typeof current !== 'number' || !Number.isFinite(current)) {
    return 1
  }
  return current + 1
}

/**
 * Never replace a higher in-memory count with a cache-served lower one.
 * @param {number} current
 * @param {number} fetched
 * @param {boolean} servedFromCache
 * @returns {number}
 */
export function mergePlayerCountDisplay(current, fetched, servedFromCache) {
  if (typeof fetched !== 'number' || !Number.isFinite(fetched)) {
    return current
  }
  if (typeof current !== 'number' || !Number.isFinite(current)) {
    return fetched
  }
  if (servedFromCache && fetched < current) {
    return current
  }
  return fetched
}

/**
 * Skip an extra player-count read when the server gameweek payload already has a number.
 * @param {number | undefined} storedCount
 * @returns {boolean}
 */
export function shouldSkipGameweekPlayerCountRefetch(storedCount) {
  return typeof storedCount === 'number' && Number.isFinite(storedCount)
}