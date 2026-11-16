import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  sumBestN,
  assignTiedRanks,
  shouldAppendGameweekToSeason,
} from '../lib/season-standings-logic.js'

describe('functions season-standings-logic', () => {
  it('sumBestN matches app helper', () => {
    assert.equal(sumBestN([2, 9, 7, 4, 6, 1], 3), 22)
  })

  it('shouldAppendGameweekToSeason matches app rules', () => {
    assert.equal(shouldAppendGameweekToSeason({ gameweekIds: [], weekCount: 6 }, 'gw-new'), true)
    assignTiedRanks([{ p: 1 }, { p: 1 }], (e) => e.p)
  })
})