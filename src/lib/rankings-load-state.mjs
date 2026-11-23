/**
 * Pure rankings load / UI state (unit-tested).
 * Distinguish loaded-with-data, truly-empty, and error/timeout — never treat errors as empty.
 */

export const RANKINGS_HANG_GATE_TIMEOUT_MESSAGE = 'Rankings load timed out'

/** @typedef {'idle' | 'loading' | 'loaded' | 'empty' | 'error'} RankingsSliceStatus */

/** @typedef {'idle' | 'loading' | 'ready' | 'no-week' | 'error'} WeeklyBoardStatus */

/** @typedef {'idle' | 'loading' | 'ready' | 'empty' | 'error'} SeasonBoardStatus */

/**
 * @param {{ succeeded: boolean, rowCount: number }} params
 * @returns {RankingsSliceStatus}
 */
export function resolveWeeklyRankingsSliceStatus({ succeeded, rowCount }) {
  if (!succeeded) return 'error'
  return rowCount > 0 ? 'loaded' : 'empty'
}

/**
 * @param {{ loadFailed: boolean, timedOut?: boolean, hasGameweek: boolean, fixtureCount: number }} params
 * @returns {WeeklyBoardStatus}
 */
export function resolveWeeklyBoardStatus({ loadFailed, hasGameweek, fixtureCount }) {
  if (loadFailed) return 'error'
  if (!hasGameweek) return 'no-week'
  if (fixtureCount === 0) return 'empty'
  return 'ready'
}

/**
 * @param {{ loadFailed: boolean, standingsCount: number, hasActiveSeason: boolean }} params
 * @returns {SeasonBoardStatus}
 */
export function resolveSeasonBoardStatus({ loadFailed, standingsCount, hasActiveSeason }) {
  if (loadFailed) return 'error'
  if (!hasActiveSeason) return 'empty'
  return standingsCount > 0 ? 'ready' : 'empty'
}

/**
 * Empty copy only when the read truly succeeded with nothing to show.
 *
 * @param {WeeklyBoardStatus} boardStatus
 * @param {RankingsSliceStatus} sliceStatus
 * @param {number} playerCount
 */
export function shouldShowWeeklyStandingsEmptyCopy(boardStatus, sliceStatus, playerCount) {
  if (boardStatus === 'error' || sliceStatus === 'error') return false
  if (playerCount > 0 && sliceStatus === 'empty') return false
  return sliceStatus === 'empty' && boardStatus === 'ready'
}

/**
 * When the banner shows N>0 players but rows failed, show error — not the empty copy.
 *
 * @param {number} playerCount
 * @param {RankingsSliceStatus} sliceStatus
 * @param {WeeklyBoardStatus} boardStatus
 */
export function shouldShowWeeklyRankingsError(playerCount, sliceStatus, boardStatus) {
  if (boardStatus === 'error') return true
  if (sliceStatus === 'error') return true
  if (playerCount > 0 && sliceStatus === 'empty' && boardStatus === 'ready') return true
  return false
}

/**
 * "No rankings available yet" — only when there is no active week (successful read).
 *
 * @param {WeeklyBoardStatus} boardStatus
 * @param {boolean} weeklyLoading
 */
export function shouldShowNoActiveWeekCopy(boardStatus, weeklyLoading) {
  if (weeklyLoading) return false
  return boardStatus === 'no-week'
}

/**
 * @param {boolean} shouldCache
 * @param {{ status: RankingsSliceStatus, servedFromServer: boolean }} slice
 */
export function shouldWriteRankingsSessionCache(shouldCache, slice) {
  if (!shouldCache) return false
  if (slice.status === 'error') return false
  if (!slice.servedFromServer) return false
  return slice.status === 'loaded' || slice.status === 'empty'
}

/**
 * Refetch when returning to foreground after failure or stale load (~2 min for iOS resume).
 *
 * @param {{ lastFailed: boolean, lastLoadAtMs: number, nowMs?: number, staleMs?: number }} params
 */
export function shouldRefetchRankingsOnResume({
  lastFailed,
  lastLoadAtMs,
  nowMs = Date.now(),
  staleMs = 2 * 60 * 1000,
}) {
  if (lastFailed) return true
  if (lastLoadAtMs <= 0) return false
  return nowMs - lastLoadAtMs >= staleMs
}

/**
 * @param {{ env?: Record<string, string | undefined>, qaQuery?: boolean }} [options]
 */
export function isRankingsQaHangEnabled(options = {}) {
  // Next.js only inlines direct `process.env.X` access — do not read via a variable env bag.
  const qaHangBuildFlag = options.env
    ? options.env.NEXT_PUBLIC_RANKINGS_QA_HANG === 'true'
    : process.env.NEXT_PUBLIC_RANKINGS_QA_HANG === 'true'

  const rawNodeEnv = options.env ? options.env.NODE_ENV : process.env.NODE_ENV
  const nodeEnv = rawNodeEnv ?? 'production'

  if (qaHangBuildFlag) return true
  if (nodeEnv === 'production') return false
  if (options.qaQuery === true) return true
  if (typeof globalThis !== 'undefined' && globalThis.location?.search) {
    return new URLSearchParams(globalThis.location.search).get('qa') === '1'
  }
  return false
}

/**
 * QA / dev only: set `window.__BANGER_RANKINGS_SIMULATE_HANG__` to a read label when
 * {@link isRankingsQaHangEnabled} is true (`NEXT_PUBLIC_RANKINGS_QA_HANG=true` at build,
 * or non-production + `?qa=1`).
 *
 * @param {string} label
 * @param {{ env?: Record<string, string | undefined>, qaQuery?: boolean }} [options]
 * @returns {boolean}
 */
export function rankingsSimulateHungRead(label, options = {}) {
  if (!isRankingsQaHangEnabled(options)) return false
  if (typeof globalThis === 'undefined') return false
  const hook = globalThis.__BANGER_RANKINGS_SIMULATE_HANG__
  return typeof hook === 'string' && hook === label
}

/**
 * When a hung read is simulated, still respect the shared load budget (throws on expiry).
 *
 * @param {string} label
 * @param {{ budgetRemainingMs?: number, timeoutMessage?: string, env?: Record<string, string | undefined>, qaQuery?: boolean }} [options]
 * @returns {Promise<void>}
 */
export async function rankingsHungReadGate(label, options = {}) {
  const nodeEnv = (options.env ? options.env.NODE_ENV : process.env.NODE_ENV) ?? 'production'
  if (nodeEnv === 'production') return
  if (!rankingsSimulateHungRead(label, options)) return

  const budgetRemainingMs = options.budgetRemainingMs ?? 0
  const timeoutMessage = options.timeoutMessage ?? RANKINGS_HANG_GATE_TIMEOUT_MESSAGE
  if (budgetRemainingMs <= 0) {
    throw new Error(timeoutMessage)
  }

  const hangForever = new Promise(() => {})
  const budgetExpired = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), budgetRemainingMs)
  })
  await Promise.race([hangForever, budgetExpired])
}