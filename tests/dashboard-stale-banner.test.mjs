import { test } from 'node:test'
import assert from 'node:assert/strict'

// Keep in sync with src/lib/dashboard-load-state.ts

function shouldShowDashboardStaleBanner(flags) {
  if (flags.servedFromFirestoreCache) return true
  if (flags.refreshFailed) return true
  if (flags.usingSessionCache && flags.isRefreshingGameweek) return true
  return false
}

function staleBannerShowsRetry(flags) {
  return flags.servedFromFirestoreCache || flags.refreshFailed
}

test('stale banner shows when Firestore served from cache', () => {
  const show = shouldShowDashboardStaleBanner({
    servedFromFirestoreCache: true,
    refreshFailed: false,
    usingSessionCache: true,
    isRefreshingGameweek: false,
  })
  assert.equal(show, true)
  assert.equal(
    staleBannerShowsRetry({ servedFromFirestoreCache: true, refreshFailed: false }),
    true
  )
})

test('stale banner hidden when fresh server data loaded', () => {
  const show = shouldShowDashboardStaleBanner({
    servedFromFirestoreCache: false,
    refreshFailed: false,
    usingSessionCache: false,
    isRefreshingGameweek: false,
  })
  assert.equal(show, false)
})

test('stale banner shows while session cache refresh is in flight', () => {
  const show = shouldShowDashboardStaleBanner({
    servedFromFirestoreCache: false,
    refreshFailed: false,
    usingSessionCache: true,
    isRefreshingGameweek: true,
  })
  assert.equal(show, true)
  assert.equal(
    staleBannerShowsRetry({ servedFromFirestoreCache: false, refreshFailed: false }),
    false
  )
})