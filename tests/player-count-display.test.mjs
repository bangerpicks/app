import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  mergePlayerCountDisplay,
  playerCountAfterFirstJoinSave,
  shouldSkipGameweekPlayerCountRefetch,
} from '../src/lib/player-count-display.mjs'

describe('playerCountAfterFirstJoinSave', () => {
  it('increments the displayed count after first join', () => {
    assert.equal(playerCountAfterFirstJoinSave(0), 1)
    assert.equal(playerCountAfterFirstJoinSave(4), 5)
  })
})

describe('mergePlayerCountDisplay', () => {
  it('does not replace a higher count with a cache-served lower one', () => {
    assert.equal(mergePlayerCountDisplay(1, 0, true), 1)
    assert.equal(mergePlayerCountDisplay(3, 2, true), 3)
  })

  it('accepts server-fetched or higher counts', () => {
    assert.equal(mergePlayerCountDisplay(0, 1, false), 1)
    assert.equal(mergePlayerCountDisplay(1, 5, true), 5)
    assert.equal(mergePlayerCountDisplay(1, 5, false), 5)
  })
})

describe('shouldSkipGameweekPlayerCountRefetch', () => {
  it('skips refetch when server payload already has a numeric count', () => {
    assert.equal(shouldSkipGameweekPlayerCountRefetch(0), true)
    assert.equal(shouldSkipGameweekPlayerCountRefetch(12), true)
    assert.equal(shouldSkipGameweekPlayerCountRefetch(undefined), false)
  })
})