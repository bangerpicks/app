import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { matchPredictionsFromStandingsPicks } from '../src/lib/weekly-standings-picks.mjs'

const details = new Map([
  [1, { homeTeam: { id: 1, name: 'A' }, awayTeam: { id: 2, name: 'B' } }],
  [2, { homeTeam: { id: 3, name: 'C' }, awayTeam: { id: 4, name: 'D' } }],
])

describe('matchPredictionsFromStandingsPicks', () => {
  it('returns [] when picks are not public yet (before lock)', () => {
    assert.deepEqual(matchPredictionsFromStandingsPicks([1, 2], details, null), [])
    assert.deepEqual(matchPredictionsFromStandingsPicks([1, 2], details, undefined), [])
  })
  it('maps picks and correctness; missing picks are null', () => {
    const out = matchPredictionsFromStandingsPicks([1, 2, 3], details, { 1: { p: 'H', c: true } })
    assert.equal(out.length, 2)
    assert.equal(out[0].prediction, 'H')
    assert.equal(out[0].correct, true)
    assert.equal(out[1].prediction, null)
    assert.equal(out[1].correct, null)
  })
  it('ignores junk values', () => {
    const out = matchPredictionsFromStandingsPicks([1], details, { 1: { p: 'Z', c: true } })
    assert.equal(out[0].prediction, null)
    assert.equal(out[0].correct, null)
  })
})
