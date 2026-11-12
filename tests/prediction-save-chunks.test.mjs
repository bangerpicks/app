import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  JOIN_BATCH_MAX_FIXTURES,
  FOLLOW_UP_BATCH_MAX_FIXTURES,
  chunkPredictionFixtures,
} from '../src/lib/prediction-save-chunks.mjs'

const TEN = Array.from({ length: 10 }, (_, i) => 1000 + i)

describe('chunkPredictionFixtures', () => {
  it('splits 10 fixtures for first-time join: 2 + 3 + 3 + 2', () => {
    const chunks = chunkPredictionFixtures(TEN, { includesGameweekJoinExtras: true })
    assert.deepEqual(chunks, [
      TEN.slice(0, 2),
      TEN.slice(2, 5),
      TEN.slice(5, 8),
      TEN.slice(8, 10),
    ])
    assert.equal(chunks[0].length, JOIN_BATCH_MAX_FIXTURES)
    assert.ok(chunks.slice(1).every((c) => c.length <= FOLLOW_UP_BATCH_MAX_FIXTURES))
  })

  it('splits 10 fixtures when cache already exists (no join extras): four chunks of 3', () => {
    const chunks = chunkPredictionFixtures(TEN, { includesGameweekJoinExtras: false })
    assert.deepEqual(chunks, [
      TEN.slice(0, 3),
      TEN.slice(3, 6),
      TEN.slice(6, 9),
      TEN.slice(9, 10),
    ])
  })

  it('join first chunk includes the first new fixture even when earlier ids are existing picks', () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const chunks = chunkPredictionFixtures(ids, {
      includesGameweekJoinExtras: true,
      firstNewFixtureId: 4,
    })
    assert.deepEqual(chunks[0], [4, 5])
    assert.equal(chunks.flat().length, 10)
  })

  it('returns empty array for no fixtures', () => {
    assert.deepEqual(chunkPredictionFixtures([], { includesGameweekJoinExtras: true }), [])
  })
})
