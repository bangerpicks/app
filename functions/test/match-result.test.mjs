import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { determineMatchWinner, getRegulationScore } from '../lib/match-result.js'

function fx(status, goals, fulltime, extra = {}) {
  return {
    fixture: { id: 1, status: { short: status } },
    goals: { home: goals[0], away: goals[1] },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: fulltime[0], away: fulltime[1] },
      extratime: { home: extra.et?.[0] ?? null, away: extra.et?.[1] ?? null },
      penalty: { home: extra.pen?.[0] ?? null, away: extra.pen?.[1] ?? null },
    },
  }
}

describe('determineMatchWinner (90-minute result)', () => {
  it('FT home win / away win / draw from score.fulltime', () => {
    assert.equal(determineMatchWinner(fx('FT', [2, 0], [2, 0])), 'H')
    assert.equal(determineMatchWinner(fx('FT', [0, 1], [0, 1])), 'A')
    assert.equal(determineMatchWinner(fx('FT', [1, 1], [1, 1])), 'D')
  })
  it('AET: fulltime 1-1, goals 2-1 => Draw (extra time ignored)', () => {
    assert.equal(determineMatchWinner(fx('AET', [2, 1], [1, 1], { et: [1, 0] })), 'D')
  })
  it('AET with a 90-minute winner keeps that winner', () => {
    assert.equal(determineMatchWinner(fx('AET', [3, 2], [1, 0], { et: [2, 2] })), 'H')
  })
  it('PEN: 90-minute 0-0, shootout 4-3 => Draw (penalties ignored)', () => {
    assert.equal(determineMatchWinner(fx('PEN', [0, 0], [0, 0], { et: [0, 0], pen: [4, 3] })), 'D')
  })
  it('PEN after ET goals: fulltime 1-1, goals 2-2 => Draw', () => {
    assert.equal(determineMatchWinner(fx('PEN', [2, 2], [1, 1], { et: [1, 1], pen: [5, 4] })), 'D')
  })
  it('FT with missing fulltime falls back to goals', () => {
    assert.equal(determineMatchWinner(fx('FT', [0, 2], [null, null])), 'A')
  })
  it('AET/PEN with missing fulltime => null (never uses goals; retry later)', () => {
    assert.equal(determineMatchWinner(fx('AET', [2, 1], [null, null])), null)
    assert.equal(determineMatchWinner(fx('PEN', [1, 1], [null, null])), null)
  })
  it('not finished / postponed / cancelled => null (unchanged)', () => {
    for (const s of ['NS', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'PST', 'CANC', 'ABD', 'SUSP', 'INT', 'AWD', 'WO', 'TBD']) {
      assert.equal(determineMatchWinner(fx(s, [1, 0], [1, 0])), null, s)
    }
  })
})

describe('getRegulationScore', () => {
  it('uses fulltime when present', () => {
    assert.deepEqual(getRegulationScore(fx('AET', [2, 1], [1, 1])), { home: 1, away: 1 })
  })
  it('falls back to goals only in regulation statuses', () => {
    assert.deepEqual(getRegulationScore(fx('2H', [1, 0], [null, null])), { home: 1, away: 0 })
    assert.equal(getRegulationScore(fx('ET', [2, 1], [null, null])), null)
  })
})
