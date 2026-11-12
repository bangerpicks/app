import test from 'node:test'
import assert from 'node:assert/strict'

// Keep in sync with src/lib/market-odds-firestore.ts
function isRecord(value) {
  return typeof value === 'object' && value !== null
}

function readTriplet(obj) {
  if (!obj) return null
  const home = obj.home
  const draw = obj.draw
  const away = obj.away
  if (typeof home !== 'number' || typeof draw !== 'number' || typeof away !== 'number') {
    return null
  }
  return { home, draw, away }
}

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

function marketOddsFromFirestoreData(data) {
  if (!isRecord(data)) return undefined

  const decimalOdds = readTriplet(isRecord(data.decimalOdds) ? data.decimalOdds : undefined)
  const impliedPercents = readTriplet(
    isRecord(data.impliedPercents) ? data.impliedPercents : undefined
  )

  if (!decimalOdds || !impliedPercents) return undefined

  const bookmakerId = data.bookmakerId
  const bookmakerName = data.bookmakerName
  const overround = data.overround
  const betId = data.betId
  const source = data.source

  if (
    source !== 'api-football' ||
    betId !== 1 ||
    typeof bookmakerId !== 'number' ||
    typeof bookmakerName !== 'string' ||
    typeof overround !== 'number'
  ) {
    return undefined
  }

  const snapshot = {
    source: 'api-football',
    betId: 1,
    bookmakerId,
    bookmakerName,
    decimalOdds,
    impliedPercents,
    overround,
  }

  if (typeof data.apiUpdatedAt === 'string' && data.apiUpdatedAt.trim()) {
    snapshot.apiUpdatedAt = data.apiUpdatedAt
  }

  return hasDisplayableMarketOdds(snapshot) ? snapshot : undefined
}

test('marketOddsFromFirestoreData returns undefined for empty friendly fixture', () => {
  assert.equal(marketOddsFromFirestoreData(undefined), undefined)
})

test('marketOddsFromFirestoreData reads persisted snapshot', () => {
  const parsed = marketOddsFromFirestoreData({
    source: 'api-football',
    betId: 1,
    bookmakerId: 4,
    bookmakerName: 'Pinnacle',
    decimalOdds: { home: 9.81, draw: 6.59, away: 1.28 },
    impliedPercents: { home: 10, draw: 15, away: 75 },
    overround: 1.0349,
    apiUpdatedAt: '2026-11-12T00:15:11+00:00',
  })

  assert.equal(parsed?.bookmakerName, 'Pinnacle')
  assert.equal(parsed?.impliedPercents.away, 75)
})
