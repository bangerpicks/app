import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  pickNextMatchPreviews,
  isMatchInPlay,
  isMatchFinished,
} from '../src/lib/gameweek-match-preview.mjs'

function match(id, status, dateMs, score) {
  return {
    fixtureId: id,
    date: new Date(dateMs),
    matchStatus: status,
    score,
    homeTeam: { id: 1, name: 'A', logo: '', form: [] },
    awayTeam: { id: 2, name: 'B', logo: '', form: [] },
    league: { id: 1, name: 'L' },
    time: '',
  }
}

describe('pickNextMatchPreviews', () => {
  it('prioritizes in-play, then upcoming, then recent FT', () => {
    const base = Date.now()
    const fixtures = [
      match(1, 'FT', base - 3_600_000, { home: 2, away: 1 }),
      match(2, 'LIVE', base, { home: 1, away: 0 }),
      match(3, 'TBP', base + 3_600_000),
      match(4, 'TBP', base + 7_200_000),
      match(5, 'HT', base + 1000, { home: 0, away: 0 }),
    ]

    const picked = pickNextMatchPreviews(fixtures, 3)
    assert.deepEqual(
      picked.map((m) => m.fixtureId),
      [2, 5, 3]
    )
  })

  it('classifies live and finished statuses', () => {
    assert.equal(isMatchInPlay('LIVE'), true)
    assert.equal(isMatchInPlay('HT'), true)
    assert.equal(isMatchFinished('FT'), true)
    assert.equal(isMatchInPlay('TBP'), false)
  })
})