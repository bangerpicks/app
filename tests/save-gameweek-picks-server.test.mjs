import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  fixturesNeedingWriteServer,
  firstNewEntryFixtureId,
} from '../src/lib/save-gameweek-picks-server.mjs'

describe('saveGameweekPicks server plan', () => {
  it('mirrors fixturesNeedingWrite on first join', () => {
    const predictions = new Map([
      [1, 'H'],
      [2, 'D'],
    ])
    assert.deepEqual(
      fixturesNeedingWriteServer({ creatingCache: true, existingPredictions: {}, predictions }),
      [1, 2]
    )
  })

  it('picks first fixture without an entry for join bonus', () => {
    const ids = [10, 11, 12]
    const first = firstNewEntryFixtureId(ids, (id) => id !== 11)
    assert.equal(first, 11)
  })
})