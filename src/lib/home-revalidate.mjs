/**
 * Pure helpers for keeping Home (dashboard) in sync with the server (unit-tested).
 *
 * v1.2.9 made Home paint from the IndexedDB cache first. That cache pass must always be
 * followed by a server pass, otherwise a newly published round, a close-out, or an
 * `activeGameweekId` change stays invisible until the user visits a server-reading page.
 */

/** Minimum gap between foreground (focus / visibility) refetches. */
export const HOME_RESUME_REFETCH_MIN_MS = 15_000

/** Debounce for live-listener change bursts (publish writes several docs). */
export const HOME_LIVE_CHANGE_DEBOUNCE_MS = 1_500

/**
 * Cache-first paint, then always revalidate from the server.
 *
 * - `loadCacheFirst()` → `{ data, servedFromCache }` (fast; may be IndexedDB data).
 * - `loadServer()` → `{ data, servedFromCache }` (server-preferring; servedFromCache true means
 *   the server failed and only cache came back).
 * - `apply(data, { stale, phase })` renders a result. `stale` = still not confirmed by server.
 * - `isCancelled()` stops applying once the page unmounts / a newer load started.
 *
 * Returns `{ serverConfirmed }`. Errors from `loadCacheFirst` propagate (no data to show);
 * errors from the revalidate pass keep the cached render and mark it stale.
 *
 * @template T
 * @param {{
 *   loadCacheFirst: () => Promise<{ data: T, servedFromCache: boolean }>,
 *   loadServer: () => Promise<{ data: T, servedFromCache: boolean }>,
 *   apply: (data: T, meta: { stale: boolean, phase: 'initial' | 'revalidate' }) => void,
 *   isCancelled?: () => boolean,
 * }} params
 * @returns {Promise<{ serverConfirmed: boolean }>}
 */
export async function loadHomeStaleWhileRevalidate({
  loadCacheFirst,
  loadServer,
  apply,
  isCancelled = () => false,
}) {
  const first = await loadCacheFirst()
  if (isCancelled()) return { serverConfirmed: false }

  if (!first.servedFromCache) {
    apply(first.data, { stale: false, phase: 'initial' })
    return { serverConfirmed: true }
  }

  // Show cached data instantly (not flagged stale yet: the server pass is in flight).
  apply(first.data, { stale: false, phase: 'initial' })

  try {
    const fresh = await loadServer()
    if (isCancelled()) return { serverConfirmed: false }
    apply(fresh.data, { stale: fresh.servedFromCache, phase: 'revalidate' })
    return { serverConfirmed: !fresh.servedFromCache }
  } catch {
    if (isCancelled()) return { serverConfirmed: false }
    apply(first.data, { stale: true, phase: 'revalidate' })
    return { serverConfirmed: false }
  }
}

/**
 * Refetch Home when the tab returns to the foreground, throttled.
 *
 * @param {{ visible: boolean, inFlight: boolean, lastServerLoadAtMs: number, nowMs?: number, minIntervalMs?: number }} params
 */
export function shouldRefetchHomeOnResume({
  visible,
  inFlight,
  lastServerLoadAtMs,
  nowMs = Date.now(),
  minIntervalMs = HOME_RESUME_REFETCH_MIN_MS,
}) {
  if (!visible || inFlight) return false
  if (!lastServerLoadAtMs || lastServerLoadAtMs <= 0) return true
  return nowMs - lastServerLoadAtMs >= minIntervalMs
}

function tsKey(value) {
  if (!value) return ''
  if (typeof value === 'object' && typeof value.seconds === 'number') return String(value.seconds)
  if (typeof value === 'object' && typeof value.toMillis === 'function') return String(value.toMillis())
  return String(value)
}

/**
 * Stable signature of the fields that change what Home shows. Ignores noisy counters
 * (playerCount, memberCount, updatedAt) so pick saves don't trigger reloads.
 *
 * @param {Array<{ id: string, data: Record<string, unknown> }>} competitions
 * @param {Array<{ id: string, data: Record<string, unknown> }>} gameweeks
 * @returns {string}
 */
export function homeCatalogSignature(competitions, gameweeks) {
  const comp = [...competitions]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, data }) =>
      [
        id,
        data.activeGameweekId ?? '',
        data.status ?? '',
        data.visibility ?? '',
        data.featured ? 1 : 0,
        data.featuredRank ?? '',
        data.displayName ?? '',
        data.displayName_esMX ?? '',
        data.tagline ?? '',
        data.tagline_esMX ?? '',
        tsKey(data.opensAt),
      ].join('|')
    )
  const gws = [...gameweeks]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, data }) =>
      [
        id,
        data.status ?? '',
        data.competitionId ?? '',
        data.type ?? '',
        data.name ?? '',
        data.name_esMX ?? '',
        tsKey(data.startDate),
        tsKey(data.endDate),
        tsKey(data.lockTime),
      ].join('|')
    )
  return `c:${comp.join(';')}#g:${gws.join(';')}`
}

/**
 * Decide whether a live snapshot means Home must reload.
 * The first server-confirmed signature is the baseline (no reload).
 *
 * @param {{ baseline: string | null, next: string, fromCache: boolean }} params
 * @returns {{ reload: boolean, baseline: string | null }}
 */
export function resolveLiveCatalogChange({ baseline, next, fromCache }) {
  if (fromCache) return { reload: false, baseline }
  if (baseline === null) return { reload: false, baseline: next }
  if (baseline === next) return { reload: false, baseline }
  return { reload: true, baseline: next }
}
