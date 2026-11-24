import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  matchWinnerFromScore,
  pickCorrectnessForMatch,
  pickGameweekCardPreviews,
  summarizeWeekFromMatchesAndPicks,
  mergePersonalSummary,
  pickPredictionChipClasses,
} from '../src/lib/gameweek-card-personal.mjs'

function match(id, status, score, dateMs = Date.now()) {
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

describe('gameweek-card-personal', () => {
  it('scores finished matches against user picks', () => {
    assert.equal(matchWinnerFromScore(2, 1), 'H')
    assert.equal(matchWinnerFromScore(1, 1), 'D')
    const m = match(1, 'FT', { home: 2, away: 0 })
    assert.equal(pickCorrectnessForMatch(m, 'H'), true)
    assert.equal(pickCorrectnessForMatch(m, 'A'), false)
    assert.equal(pickCorrectnessForMatch(match(2, 'NS', undefined), 'H'), null)
  })

  it('summarizes points from finished fixtures', () => {
    const matches = [
      match(1, 'FT', { home: 1, away: 0 }),
      match(2, 'FT', { home: 0, away: 1 }),
      match(3, 'NS', undefined),
    ]
    const picks = new Map([
      [1, 'H'],
      [2, 'H'],
      [3, 'A'],
    ])
    const s = summarizeWeekFromMatchesAndPicks(matches, picks)
    assert.equal(s.correct, 1)
    assert.equal(s.points, 1)
    assert.equal(s.picksSaved, 3)
  })

  it('prefers picked fixtures for card previews', () => {
    const base = Date.now()
    const matches = [
      match(10, 'TBP', undefined, base + 99_000),
      match(20, 'TBP', undefined, base + 1_000),
      match(30, 'TBP', undefined, base + 2_000),
    ]
    const picks = new Map([[20, 'H']])
    const picked = pickGameweekCardPreviews(matches, picks, 3)
    assert.deepEqual(
      picked.map((m) => m.fixtureId),
      [20]
    )
  })

  it('merges standings over live totals when present', () => {
    const merged = mergePersonalSummary(
      { rank: 2, points: 5, correct: 5 },
      { correct: 1, points: 1, picksSaved: 10, totalFixtures: 10 },
      'LIVE'
    )
    assert.equal(merged.rank, 2)
    assert.equal(merged.points, 5)
    assert.equal(merged.correct, 5)
  })

  it('exposes pick chip classes aligned with rankings colors', () => {
    assert.match(pickPredictionChipClasses(true, true).bg, /lime-yellow/)
    assert.match(pickPredictionChipClasses(false, true).bg, /cinnabar/)
  })
})