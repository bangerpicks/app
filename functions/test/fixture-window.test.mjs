import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  fixtureNeedsLiveApiPoll,
  fixtureNeedsScoringApiPoll,
  isMatchFinished,
} from '../lib/fixture-window.js'

const HOUR = 60 * 60 * 1000
const kickoff = Math.floor(new Date('2026-03-15T15:00:00Z').getTime() / 1000)

describe('fixtureNeedsLiveApiPoll', () => {
  it('skips before kickoff window', () => {
    const nowMs = kickoff * 1000 - 30 * 60 * 1000
    assert.equal(
      fixtureNeedsLiveApiPoll({ kickoffTimestampSec: kickoff, statusShort: 'NS', nowMs }),
      false
    )
  })

  it('polls during live window', () => {
    const nowMs = kickoff * 1000 + 45 * 60 * 1000
    assert.equal(
      fixtureNeedsLiveApiPoll({ kickoffTimestampSec: kickoff, statusShort: '1H', nowMs }),
      true
    )
  })

  it('polls stale in-play status after match window (frozen 2H)', () => {
    const nowMs = kickoff * 1000 + 10 * 24 * HOUR
    assert.equal(
      fixtureNeedsLiveApiPoll({ kickoffTimestampSec: kickoff, statusShort: '2H', nowMs }),
      true
    )
  })

  it('stops polling finished matches long after window', () => {
    const nowMs = kickoff * 1000 + 10 * 24 * HOUR
    assert.equal(
      fixtureNeedsLiveApiPoll({ kickoffTimestampSec: kickoff, statusShort: 'FT', nowMs }),
      false
    )
  })
})

describe('fixtureNeedsScoringApiPoll', () => {
  it('skips when no unawarded predictions', () => {
    assert.equal(
      fixtureNeedsScoringApiPoll({ kickoffTimestampSec: kickoff, statusShort: 'FT' }, false),
      false
    )
  })

  it('polls finished fixture with unawarded predictions', () => {
    assert.equal(
      fixtureNeedsScoringApiPoll({ kickoffTimestampSec: kickoff, statusShort: 'FT' }, true),
      true
    )
  })
})

describe('isMatchFinished', () => {
  it('recognizes terminal statuses', () => {
    assert.equal(isMatchFinished('FT'), true)
    assert.equal(isMatchFinished('2H'), false)
  })
})
