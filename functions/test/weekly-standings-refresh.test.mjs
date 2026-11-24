import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import admin from 'firebase-admin'
import { weeklyPicksVisible, weeklyStandingsNeedsRefresh } from '../lib/standings-update.js'

const { Timestamp } = admin.firestore
const NOW = Date.UTC(2026, 10, 25, 18, 0, 0)

describe('weeklyPicksVisible (D3: picks public after lock)', () => {
  it('hidden before lock, visible after lock and when completed', () => {
    assert.equal(weeklyPicksVisible({ status: 'active', lockAt: Timestamp.fromMillis(NOW + 1) }, NOW), false)
    assert.equal(weeklyPicksVisible({ status: 'active', lockAt: Timestamp.fromMillis(NOW) }, NOW), true)
    assert.equal(weeklyPicksVisible({ status: 'active', deadline: Timestamp.fromMillis(NOW - 1) }, NOW), true)
    assert.equal(weeklyPicksVisible({ status: 'completed' }, NOW), true)
  })
  it('forceOpenForTesting rounds keep picks hidden while active; no lock = hidden', () => {
    assert.equal(weeklyPicksVisible({ status: 'active', forceOpenForTesting: true, lockAt: Timestamp.fromMillis(NOW - 1) }, NOW), false)
    assert.equal(weeklyPicksVisible({ status: 'active' }, NOW), false)
  })
})

describe('weeklyStandingsNeedsRefresh', () => {
  const base = { exists: true, builtAtMs: 100, dirtyAtMs: null, picksVisibleNow: false, docPicksVisible: false }
  it('missing or never built', () => {
    assert.equal(weeklyStandingsNeedsRefresh({ ...base, exists: false }), true)
    assert.equal(weeklyStandingsNeedsRefresh({ ...base, builtAtMs: null }), true)
  })
  it('dirty after last build', () => {
    assert.equal(weeklyStandingsNeedsRefresh({ ...base, dirtyAtMs: 200 }), true)
    assert.equal(weeklyStandingsNeedsRefresh({ ...base, dirtyAtMs: 50 }), false)
  })
  it('round just locked: rebuild once to publish picks', () => {
    assert.equal(weeklyStandingsNeedsRefresh({ ...base, picksVisibleNow: true }), true)
    assert.equal(weeklyStandingsNeedsRefresh({ ...base, picksVisibleNow: true, docPicksVisible: true }), false)
  })
})
