import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  hasWeeklyStandingsRows,
  pickPluralKey,
  shouldShowWeeklyStandingsEmpty,
} from '../src/lib/i18n-plural.mjs'

describe('pickPluralKey', () => {
  it('uses the singular key only for count === 1', () => {
    assert.equal(pickPluralKey(1, 'one', 'many'), 'one')
    assert.equal(pickPluralKey(0, 'one', 'many'), 'many')
    assert.equal(pickPluralKey(2, 'one', 'many'), 'many')
    assert.equal(pickPluralKey(42, 'one', 'many'), 'many')
  })
})

describe('shouldShowWeeklyStandingsEmpty', () => {
  it('shows empty state when not loading and rankings are missing or empty', () => {
    assert.equal(shouldShowWeeklyStandingsEmpty(undefined, false), true)
    assert.equal(shouldShowWeeklyStandingsEmpty([], false), true)
  })

  it('hides empty state while loading or when rows exist', () => {
    assert.equal(shouldShowWeeklyStandingsEmpty([], true), false)
    assert.equal(shouldShowWeeklyStandingsEmpty(undefined, true), false)
    assert.equal(
      shouldShowWeeklyStandingsEmpty([{ userId: 'u1', rank: 1 }], false),
      false
    )
  })
})

describe('hasWeeklyStandingsRows', () => {
  it('is true only for a non-empty array', () => {
    assert.equal(hasWeeklyStandingsRows(undefined), false)
    assert.equal(hasWeeklyStandingsRows([]), false)
    assert.equal(hasWeeklyStandingsRows([{ userId: 'a' }]), true)
  })
})