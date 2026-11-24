import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  pickGameweekCardPreviews,
  pickNextMatchPreviews,
  isMatchInPlay,
  isMatchFinished,
  matchWinnerFromScore,
  pickCorrectnessForMatch,
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

describe('pick correctness', () => {
  it('scores finished matches against user picks', () => {
    assert.equal(matchWinnerFromScore(2, 1), 'H')
    assert.equal(matchWinnerFromScore(1, 1), 'D')
    const m = match(1, 'FT', Date.now(), { home: 2, away: 0 })
    assert.equal(pickCorrectnessForMatch(m, 'H'), true)
    assert.equal(pickCorrectnessForMatch(m, 'A'), false)
    assert.equal(pickCorrectnessForMatch(match(2, 'NS', Date.now()), 'H'), null)
  })
})

describe('pickGameweekCardPreviews', () => {
  it('shows only user-picked fixtures in kickoff order when user has picks', () => {
    const base = Date.now()
    const fixtures = [
      match(10, 'TBP', base + 99_000),
      match(20, 'TBP', base + 1_000),
      match(30, 'TBP', base + 2_000),
    ]
    const picks = new Map([[20, 'H']])
    const picked = pickGameweekCardPreviews(fixtures, picks, 3)
    assert.deepEqual(
      picked.map((m) => m.fixtureId),
      [20]
    )
  })

  it('falls back to next-match previews without picks', () => {
    const base = Date.now()
    const fixtures = [match(1, 'TBP', base + 1_000), match(2, 'TBP', base + 2_000)]
    const picked = pickGameweekCardPreviews(fixtures, new Map(), 1)
    assert.deepEqual(picked.map((m) => m.fixtureId), [1])
  })
})