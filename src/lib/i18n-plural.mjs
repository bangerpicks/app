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
