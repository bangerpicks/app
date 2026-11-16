import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  sumBestN,
  assignTiedRanks,
  compareSeasonStandingRows,
  pickCountingWeekIds,
  shouldAppendGameweekToSeason,
  defaultRankingsTab,
} from '../src/lib/season-standings.mjs'

describe('sumBestN', () => {
  it('sums best 3 of 6', () => {
    assert.equal(sumBestN([1, 5, 3, 8, 2, 7], 3), 20)
  })

  it('sums all weeks when fewer than bestN', () => {
    assert.equal(sumBestN([4, 2], 3), 6)
  })
})

describe('assignTiedRanks', () => {
  it('shares rank on ties', () => {
    const rows = [
      { uid: 'a', pts: 5 },
      { uid: 'b', pts: 5 },
      { uid: 'c', pts: 3 },
    ]
    assignTiedRanks(rows, (r) => r.pts)
    assert.deepEqual(
      rows.map((r) => r.rank),
      [1, 1, 3]
    )
  })
})

describe('compareSeasonStandingRows', () => {
  it('breaks ties by correct then join', () => {
    assert.ok(
      compareSeasonStandingRows(
        { seasonPoints: 10, totalCorrect: 8, joinMs: 100 },
        { seasonPoints: 10, totalCorrect: 5, joinMs: 50 }
      ) < 0
    )
    assert.ok(
      compareSeasonStandingRows(
        { seasonPoints: 10, totalCorrect: 8, joinMs: 100 },
        { seasonPoints: 10, totalCorrect: 8, joinMs: 200 }
      ) < 0
    )
  })
})

describe('pickCountingWeekIds', () => {
  it('picks top weeks', () => {
    const ids = pickCountingWeekIds(
      [
        { gameweekId: 'gw1', points: 3 },
        { gameweekId: 'gw2', points: 8 },
        { gameweekId: 'gw3', points: 5 },
      ],
      2
    )
    assert.deepEqual(ids.sort(), ['gw2', 'gw3'].sort())
  })
})

describe('shouldAppendGameweekToSeason', () => {
  it('allows append under weekCount', () => {
    assert.equal(
      shouldAppendGameweekToSeason({ gameweekIds: ['a'], weekCount: 6 }, 'b'),
      true
    )
  })

  it('refuses when full', () => {
    assert.equal(
      shouldAppendGameweekToSeason(
        { gameweekIds: ['a', 'b', 'c', 'd', 'e', 'f'], weekCount: 6 },
        'g'
      ),
      false
    )
  })
})

describe('defaultRankingsTab', () => {
  it('defaults to this week', () => {
    assert.equal(defaultRankingsTab(), 'this-week')
  })
})