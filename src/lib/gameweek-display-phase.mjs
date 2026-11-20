/**
 * UI-only gameweek display phases (not used for save permissions).
 * @typedef {'UPCOMING' | 'OPEN' | 'CLOSING_SOON' | 'PICKS_LOCKED' | 'LIVE' | 'FINAL' | 'COMPLETED'} GameweekDisplayPhase
 * @typedef {import('@/types/dashboard').GameweekStatus} GameweekStatus
 */

/**
 * @typedef {object} FixtureSlateSummary
 * @property {boolean} hasLive
 * @property {boolean} allFinished
 * @property {boolean} hasUpcoming
 * @property {number} total
 */

/**
 * @typedef {object} ResolveDisplayPhaseInput
 * @property {GameweekStatus} dashboardStatus
 * @property {'normal' | 'warning' | 'critical' | 'expired'} urgencyLevel
 * @property {FixtureSlateSummary} slate
 */

/**
 * @param {ResolveDisplayPhaseInput} input
 * @returns {GameweekDisplayPhase}
 */
export function resolveGameweekDisplayPhase({ dashboardStatus, urgencyLevel, slate }) {
  if (dashboardStatus === 'COMPLETED') {
    return 'COMPLETED'
  }
  if (dashboardStatus === 'UPCOMING') {
    return 'UPCOMING'
  }

  if (slate.hasLive) {
    return 'LIVE'
  }

  if (dashboardStatus === 'OPEN') {
    if (urgencyLevel === 'warning' || urgencyLevel === 'critical') {
      return 'CLOSING_SOON'
    }
    return 'OPEN'
  }

  // CLOSED (picks locked) while admin still active
  if (slate.allFinished && slate.total > 0) {
    return 'FINAL'
  }

  return 'PICKS_LOCKED'
}