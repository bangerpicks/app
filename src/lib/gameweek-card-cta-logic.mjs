/**
 * Pure CTA visibility for GameweekCard (unit-tested).
 * @typedef {'OPEN'|'CLOSING_SOON'|'PICKS_LOCKED'|'LIVE'|'FINAL'|'COMPLETED'|'UPCOMING'} GameweekDisplayPhase
 */

/**
 * @param {GameweekDisplayPhase} phase
 * @param {boolean} hasAnyPicks
 * @param {number} playerCount
 */
export function shouldShowGameweekTableCta(phase, hasAnyPicks, playerCount) {
  return phase !== 'UPCOMING' && (hasAnyPicks || playerCount > 0)
}

/**
 * @param {GameweekDisplayPhase} phase
 * @param {boolean} hasAnyPicks
 */
export function shouldShowPersonalGameweekCta(phase, hasAnyPicks) {
  if (phase === 'UPCOMING') return false
  if (phase === 'OPEN' || phase === 'CLOSING_SOON') return true
  return hasAnyPicks
}

/**
 * i18n keys for personal CTA copy (resolve in UI with next-intl).
 * @param {GameweekDisplayPhase} phase
 * @param {boolean} hasAnyPicks
 * @returns {'makePicks'|'editMyPicks'|'myPicks'|'myResults'}
 */
export function personalGameweekCtaMessageKey(phase, hasAnyPicks) {
  if (phase === 'OPEN' || phase === 'CLOSING_SOON') {
    return hasAnyPicks ? 'editMyPicks' : 'makePicks'
  }
  if (phase === 'PICKS_LOCKED' || phase === 'LIVE') {
    return 'myPicks'
  }
  return 'myResults'
}

/**
 * @param {GameweekDisplayPhase} phase
 * @param {boolean} hasAnyPicks
 * @param {number} playerCount
 * @returns {'gameweekNotePicksLockedLeaderboard'|null}
 */
export function gameweekCardNoteOverrideKey(phase, hasAnyPicks, playerCount) {
  if (hasAnyPicks || playerCount <= 0) return null
  if (phase === 'PICKS_LOCKED' || phase === 'LIVE') {
    return 'gameweekNotePicksLockedLeaderboard'
  }
  return null
}