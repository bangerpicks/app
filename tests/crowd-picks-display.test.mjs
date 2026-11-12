import test from 'node:test'
import assert from 'node:assert/strict'

function crowdStatsToPercents(stats) {
  if (stats.total === 0) return null
  let home = Math.round((stats.home / stats.total) * 100)
  let draw = Math.round((stats.draw / stats.total) * 100)
  let away = Math.round((stats.away / stats.total) * 100)
  const drift = 100 - (home + draw + away)
  if (drift !== 0) {
    away += drift
  }
  return { home, draw, away }
}

test('crowd pick counts are shown as raw totals, not label percentages', () => {
  const stats = { home: 4, draw: 1, away: 1, total: 6 }
  const percents = crowdStatsToPercents(stats)
  assert.deepEqual(percents, { home: 67, draw: 17, away: 16 })
  assert.equal(stats.home, 4)
  assert.equal(stats.draw, 1)
  assert.equal(stats.away, 1)
})
