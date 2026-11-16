/**
 * Small plural helpers for message key selection (unit-tested; keep in sync with UI).
 */

/**
 * @param {number} count
 * @param {string} oneKey
 * @param {string} otherKey
 * @returns {string}
 */
export function pickPluralKey(count, oneKey, otherKey) {
  return count === 1 ? oneKey : otherKey
}

/**
 * Whether the weekly rankings table should be replaced by the empty-state panel.
 *
 * @param {unknown[] | undefined} weeklyRankings
 * @param {boolean} weeklyLoading
 * @returns {boolean}
 */
export function shouldShowWeeklyStandingsEmpty(weeklyRankings, weeklyLoading) {
  if (weeklyLoading) return false
  return !weeklyRankings || weeklyRankings.length === 0
}

/**
 * @param {unknown[] | undefined} weeklyRankings
 * @returns {boolean}
 */
export function hasWeeklyStandingsRows(weeklyRankings) {
  return Array.isArray(weeklyRankings) && weeklyRankings.length > 0
}