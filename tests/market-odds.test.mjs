import test from 'node:test'
import assert from 'node:assert/strict'

// Keep in sync with src/lib/market-odds.ts
function hasDisplayableMarketOdds(marketOdds) {
  if (!marketOdds) return false
  const { impliedPercents, decimalOdds, bookmakerName } = marketOdds
  if (!bookmakerName?.trim()) return false
  const nums = [
    impliedPercents?.home,
    impliedPercents?.draw,
    impliedPercents?.away,
    decimalOdds?.home,
    decimalOdds?.draw,
    decimalOdds?.away,
  ]
  return nums.every((n) => typeof n === 'number' && Number.isFinite(n))
}

test('hasDisplayableMarketOdds is false when odds snapshot missing', () => {
  assert.equal(hasDisplayableMarketOdds(undefined), false)
  assert.equal(hasDisplayableMarketOdds(null), false)
})

test('hasDisplayableMarketOdds is false for incomplete snapshot (no templated fallback)', () => {
  assert.equal(
    hasDisplayableMarketOdds({
      source: 'api-football',
      betId: 1,
      bookmakerId: 4,
      bookmakerName: 'Pinnacle',
      impliedPercents: { home: 10, draw: 15, away: 75 },
      decimalOdds: { home: 9.81, draw: 6.59, away: NaN },
      overround: 1.03,
    }),
    false
  )
})

test('hasDisplayableMarketOdds is true for complete market snapshot', () => {
  assert.equal(
    hasDisplayableMarketOdds({
      source: 'api-football',
      betId: 1,
      bookmakerId: 4,
      bookmakerName: 'Pinnacle',
      impliedPercents: { home: 10, draw: 15, away: 75 },
      decimalOdds: { home: 9.81, draw: 6.59, away: 1.28 },
      overround: 1.03,
    }),
    true
  )
})
