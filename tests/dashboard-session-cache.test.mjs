import { test } from 'node:test'
import assert from 'node:assert/strict'

// Keep in sync with src/lib/dashboard-cache.ts

const DASHBOARD_SESSION_CACHE_TTL_MS = 10 * 60 * 1000
const DASHBOARD_SESSION_CACHE_KEY_PREFIX = 'banger-picks-dashboard-cache:v1'

function dashboardSessionCacheKey(uid, locale) {
  return `${DASHBOARD_SESSION_CACHE_KEY_PREFIX}:${uid ?? 'anon'}:${locale}`
}

function isCacheEntryFresh(savedAt, nowMs = Date.now()) {
  return nowMs - savedAt <= DASHBOARD_SESSION_CACHE_TTL_MS
}

test('dashboard session cache key includes uid and locale', () => {
  assert.equal(dashboardSessionCacheKey('uid-abc', 'en'), `${DASHBOARD_SESSION_CACHE_KEY_PREFIX}:uid-abc:en`)
  assert.equal(dashboardSessionCacheKey(null, 'es-MX'), `${DASHBOARD_SESSION_CACHE_KEY_PREFIX}:anon:es-MX`)
  assert.notEqual(
    dashboardSessionCacheKey('user-a', 'en'),
    dashboardSessionCacheKey('user-b', 'en')
  )
})

test('dashboard session cache TTL expires after 10 minutes', () => {
  const savedAt = Date.now() - DASHBOARD_SESSION_CACHE_TTL_MS - 1
  assert.equal(isCacheEntryFresh(savedAt), false)
  assert.equal(isCacheEntryFresh(Date.now() - 60_000), true)
})