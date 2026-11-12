import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  devigImpliedPercents,
  extractMatchWinnerOdds,
  parsePreMatchOddsFromApiPayload,
  selectPreferredBookmaker,
  bookmakerHasCompleteMatchWinnerTrio,
  fixtureNeedsPreMatchOddsRefresh,
} from '../lib/market-odds.js'

describe('devigImpliedPercents', () => {
  it('de-vigs Pinnacle Serbia vs Germany odds to percents summing to 100', () => {
    const { impliedPercents, overround } = devigImpliedPercents({
      home: 9.81,
      draw: 6.59,
      away: 1.28,
    })

    assert.ok(overround > 1)
    assert.equal(
      impliedPercents.home + impliedPercents.draw + impliedPercents.away,
      100
    )
    assert.equal(impliedPercents.home, 10)
    assert.equal(impliedPercents.draw, 15)
    assert.equal(impliedPercents.away, 75)
  })
})

describe('selectPreferredBookmaker', () => {
  const pinnacle = {
    id: 4,
    name: 'Pinnacle',
    bets: [
      {
        id: 1,
        name: 'Match Winner',
        values: [
          { value: 'Home', odd: '9.81' },
          { value: 'Draw', odd: '6.59' },
          { value: 'Away', odd: '1.28' },
        ],
      },
    ],
  }
  const bet365 = {
    id: 8,
    name: 'Bet365',
    bets: [
      {
        id: 1,
        values: [
          { value: 'Home', odd: '10.00' },
          { value: 'Draw', odd: '6.50' },
          { value: 'Away', odd: '1.25' },
        ],
      },
    ],
  }
  const williamHill = {
    id: 7,
    name: 'William Hill',
    bets: [
      {
        id: 1,
        values: [
          { value: 'Home', odd: '8.00' },
          { value: 'Draw', odd: '5.50' },
          { value: 'Away', odd: '1.25' },
        ],
      },
    ],
  }

  it('prefers Pinnacle over Bet365 and William Hill', () => {
    const picked = selectPreferredBookmaker([williamHill, bet365, pinnacle])
    assert.equal(picked?.id, 4)
    assert.equal(picked?.name, 'Pinnacle')
  })

  it('falls back to Bet365 when Pinnacle trio incomplete', () => {
    const brokenPinnacle = {
      ...pinnacle,
      bets: [
        {
          id: 1,
          values: [{ value: 'Home', odd: '9.81' }],
        },
      ],
    }
    const picked = selectPreferredBookmaker([brokenPinnacle, bet365, williamHill])
    assert.equal(picked?.id, 8)
  })

  it('uses first complete trio when preferred bookmakers missing', () => {
    const marathon = {
      id: 2,
      name: 'Marathonbet',
      bets: [
        {
          id: 1,
          values: [
            { value: 'Home', odd: '3.10' },
            { value: 'Draw', odd: '3.40' },
            { value: 'Away', odd: '2.20' },
          ],
        },
      ],
    }
    const picked = selectPreferredBookmaker([marathon])
    assert.equal(picked?.id, 2)
  })
})

describe('parsePreMatchOddsFromApiPayload', () => {
  it('returns null when bookmakers missing', () => {
    assert.equal(parsePreMatchOddsFromApiPayload({ bookmakers: [] }), null)
    assert.equal(parsePreMatchOddsFromApiPayload(undefined), null)
  })

  it('parses complete payload with decimal odds and percents', () => {
    const parsed = parsePreMatchOddsFromApiPayload({
      update: '2026-11-12T00:15:11+00:00',
      bookmakers: [
        {
          id: 4,
          name: 'Pinnacle',
          bets: [
            {
              id: 1,
              name: 'Match Winner',
              values: [
                { value: 'Home', odd: '9.81' },
                { value: 'Draw', odd: '6.59' },
                { value: 'Away', odd: '1.28' },
              ],
            },
          ],
        },
      ],
    })

    assert.equal(parsed?.bookmakerName, 'Pinnacle')
    assert.equal(parsed?.decimalOdds.home, 9.81)
    assert.equal(parsed?.impliedPercents.away, 75)
  })
})

describe('bookmakerHasCompleteMatchWinnerTrio', () => {
  it('detects incomplete Match Winner values', () => {
    assert.equal(
      bookmakerHasCompleteMatchWinnerTrio({
        id: 4,
        bets: [{ id: 1, values: [{ value: 'Home', odd: '2.00' }] }],
      }),
      false
    )
    const odds = extractMatchWinnerOdds({
      id: 4,
      bets: [
        {
          id: 1,
          values: [
            { value: 'Home', odd: '2.10' },
            { value: 'Draw', odd: '3.20' },
            { value: 'Away', odd: '3.50' },
          ],
        },
      ],
    })
    assert.deepEqual(odds, { home: 2.1, draw: 3.2, away: 3.5 })
  })
})

describe('fixtureNeedsPreMatchOddsRefresh', () => {
  const kickoff = Math.floor(new Date('2026-11-13T19:45:00Z').getTime() / 1000)

  it('stops refreshing after kickoff', () => {
    const nowMs = kickoff * 1000 + 60_000
    assert.equal(
      fixtureNeedsPreMatchOddsRefresh({
        kickoffTimestampSec: kickoff,
        statusShort: 'NS',
        lastCheckedAtMs: null,
        nowMs,
      }),
      false
    )
  })

  it('skips refresh when checked within 3 hours', () => {
    const nowMs = kickoff * 1000 - 2 * 60 * 60 * 1000
    assert.equal(
      fixtureNeedsPreMatchOddsRefresh({
        kickoffTimestampSec: kickoff,
        statusShort: 'NS',
        lastCheckedAtMs: nowMs - 30 * 60 * 1000,
        nowMs,
      }),
      false
    )
  })
})
