/**
 * Pure helpers for dashboard load / stale UI (unit-tested).
 */

export function rejectIfCacheOnlySnapshotMeta(
  fromCache: boolean,
  timeoutMessage: string
): { rejected: boolean; errorMessage?: string } {
  if (fromCache) {
    return { rejected: true, errorMessage: timeoutMessage }
  }
  return { rejected: false }
}

export function shouldShowDashboardStaleBanner(flags: {
  servedFromFirestoreCache: boolean
  refreshFailed: boolean
  usingSessionCache: boolean
  isRefreshingGameweek: boolean
}): boolean {
  if (flags.servedFromFirestoreCache) return true
  if (flags.refreshFailed) return true
  if (flags.usingSessionCache && flags.isRefreshingGameweek) return true
  return false
}

export function staleBannerShowsRetry(flags: {
  servedFromFirestoreCache: boolean
  refreshFailed: boolean
}): boolean {
  return flags.servedFromFirestoreCache || flags.refreshFailed
}