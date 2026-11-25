import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import admin from 'firebase-admin'
import { weeklyPicksVisible, weeklyStandingsNeedsRefresh } from '../lib/standings-update.js'

const { Timestamp } = admin.firestore
const NOW = Date.UTC(2026, 10, 25, 18, 0, 0)

describe('weeklyPicksVisible (Rankings pick columns in weeklyStandings)', () => {
  it('visible while the round is open and after lock', () => {
    assert.equal(weeklyPicksVisible({ status: 'active', lockAt: Timestamp.fromMillis(NOW + 1) }, NOW), true)
    assert.equal(weeklyPicksVisible({ status: 'active', lockAt: Timestamp.fromMillis(NOW) }, NOW), true)
    assert.equal(weeklyPicksVisible({ status: 'active', deadline: Timestamp.fromMillis(NOW - 1) }, NOW), true)
    assert.equal(weeklyPicksVisible({ status: 'completed' }, NOW), true)
    assert.equal(weeklyPicksVisible({ status: 'active' }, NOW), true)
  })
  it('forceOpenForTesting rounds omit picks while active', () => {
    assert.equal(
      weeklyPicksVisible({ status: 'active', forceOpenForTesting: true, lockAt: Timestamp.fromMillis(NOW - 1) }, NOW),
      false
    )
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
  it('rebuild when picks should be public but the snapshot omits them', () => {
    assert.equal(weeklyStandingsNeedsRefresh({ ...base, picksVisibleNow: true }), true)
    assert.equal(weeklyStandingsNeedsRefresh({ ...base, picksVisibleNow: true, docPicksVisible: true }), false)
  })
  it('rebuild when playerCount > 0 but standings rows are empty', () => {
    assert.equal(
      weeklyStandingsNeedsRefresh({
        ...base,
        picksVisibleNow: true,
        docPicksVisible: true,
        playerCount: 4,
        entryCount: 0,
      }),
      true
    )
    assert.equal(
      weeklyStandingsNeedsRefresh({
        ...base,
        picksVisibleNow: true,
        docPicksVisible: true,
        playerCount: 4,
        entryCount: 2,
      }),
      false
    )
  })
})