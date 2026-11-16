import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { weekNavigationState } from '../src/lib/rankings-week-nav.mjs'

describe('weekNavigationState', () => {
  it('active W2 + completed W1: Prev from W2 goes to W1; Next disabled on W2', () => {
    const weekCount = 2
    const onActive = weekNavigationState(0, weekCount)
    assert.equal(onActive.canGoToOlderWeek, true)
    assert.equal(onActive.canGoToNewerWeek, false)
    assert.equal(onActive.olderWeekIndex, 1)
    assert.equal(onActive.newerWeekIndex, null)

    const onW1 = weekNavigationState(1, weekCount)
    assert.equal(onW1.canGoToOlderWeek, false)
    assert.equal(onW1.canGoToNewerWeek, true)
    assert.equal(onW1.newerWeekIndex, 0)
    assert.equal(onW1.olderWeekIndex, null)
  })
})