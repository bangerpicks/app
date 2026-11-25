import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowHomePlayCard, isCompetitionInMyGames } from '../src/lib/home-membership-filter.mjs'

test('hides dismissed featured card', () => {
  const show = shouldShowHomePlayCard('banger-world', 'gw-1', {
    dismissedCompetitionIds: ['banger-world'],
    pendingLeaveByCompetitionId: new Map(),
    memberCompetitionIds: [],
  })
  assert.equal(show, false)
})

test('keeps card during deferred leave', () => {
  const pending = new Map([['midweek-mayhem', 'gw-2']])
  const show = shouldShowHomePlayCard('midweek-mayhem', 'gw-2', {
    dismissedCompetitionIds: [],
    pendingLeaveByCompetitionId: pending,
    memberCompetitionIds: ['midweek-mayhem'],
  })
  assert.equal(show, true)
})

test('isCompetitionInMyGames respects membership list', () => {
  assert.equal(
    isCompetitionInMyGames('liguilla-loca', {
      memberCompetitionIds: ['liguilla-loca'],
      dismissedCompetitionIds: [],
    }),
    true
  )
  assert.equal(
    isCompetitionInMyGames('liguilla-loca', {
      memberCompetitionIds: [],
      dismissedCompetitionIds: ['liguilla-loca'],
    }),
    false
  )
})