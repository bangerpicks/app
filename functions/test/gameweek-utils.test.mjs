import test from 'node:test'
import assert from 'node:assert/strict'
import {
  shouldAwardPodiumBonuses,
  shouldEnforceSingleActiveFlagshipOnWrite,
  isFlagshipGameweek,
} from '../lib/gameweek-utils.js'

test('shouldAwardPodiumBonuses only on active to completed once', () => {
  assert.equal(shouldAwardPodiumBonuses('active', 'completed', undefined), true)
  assert.equal(shouldAwardPodiumBonuses('completed', 'completed', undefined), false)
  assert.equal(shouldAwardPodiumBonuses('archived', 'completed', undefined), false)
  assert.equal(shouldAwardPodiumBonuses('active', 'completed', { seconds: 1 }), false)
  assert.equal(shouldAwardPodiumBonuses('active', 'archived', undefined), false)
})

test('shouldEnforceSingleActiveFlagshipOnWrite when flagship becomes active', () => {
  assert.equal(
    shouldEnforceSingleActiveFlagshipOnWrite('draft', 'active', { type: 'banger-week' }),
    true
  )
  assert.equal(
    shouldEnforceSingleActiveFlagshipOnWrite('active', 'active', { type: 'banger-week' }),
    false
  )
  assert.equal(
    shouldEnforceSingleActiveFlagshipOnWrite('draft', 'active', { type: 'league' }),
    false
  )
})

test('isFlagshipGameweek treats missing type as flagship', () => {
  assert.equal(isFlagshipGameweek({}), true)
  assert.equal(isFlagshipGameweek({ type: 'cup' }), false)
})
