import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  fixturesNeedingWrite,
  predictionEntryReadRounds,
} from '../src/lib/prediction-save-plan.mjs'

describe('fixturesNeedingWrite', () => {
  it('writes all fixtures on first join (creating cache)', () => {
    const predictions = new Map([
      [1, 'H'],
      [2, 'D'],
      [3, 'A'],
    ])
    const ids = fixturesNeedingWrite({
      creatingCache: true,
      existingPredictions: {},
      predictions,
    })
    assert.deepEqual(ids, [1, 2, 3])
  })

  it('writes only changed fixtures on follow-up save', () => {
    const predictions = new Map([
      [1, 'H'],
      [2, 'D'],
      [3, 'A'],
    ])
    const ids = fixturesNeedingWrite({
      creatingCache: false,
      existingPredictions: { 1: 'H', 2: 'D', 3: 'H' },
      predictions,
    })
    assert.deepEqual(ids, [3])
  })

  it('returns empty when nothing changed', () => {
    const predictions = new Map([[1, 'H']])
    const ids = fixturesNeedingWrite({
      creatingCache: false,
      existingPredictions: { 1: 'H' },
      predictions,
    })
    assert.deepEqual(ids, [])
  })
})

describe('predictionEntryReadRounds', () => {
  it('uses a single parallel read round', () => {
    assert.equal(predictionEntryReadRounds(10), 1)
    assert.equal(predictionEntryReadRounds(1), 1)
    assert.equal(predictionEntryReadRounds(0), 0)
  })
})