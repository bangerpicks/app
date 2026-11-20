import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { summarizeFixtureSlate } from '../src/lib/gameweek-match-preview.mjs'
import { resolveGameweekDisplayPhase } from '../src/lib/gameweek-display-phase.mjs'

function match(status) {
  return { fixtureId: 1, matchStatus: status, date: new Date() }
}

describe('summarizeFixtureSlate', () => {
  it('empty slate is not allFinished', () => {
    const s = summarizeFixtureSlate([])
    assert.equal(s.total, 0)
    assert.equal(s.allFinished, false)
  })

  it('detects live and all finished', () => {
    const live = summarizeFixtureSlate([match('LIVE'), match('TBP')])
    assert.equal(live.hasLive, true)
    assert.equal(live.allFinished, false)

    const done = summarizeFixtureSlate([match('FT'), match('FT')])
    assert.equal(done.allFinished, true)
    assert.equal(done.hasLive, false)
  })
})

describe('resolveGameweekDisplayPhase', () => {
  const emptySlate = summarizeFixtureSlate([])

  it('CLOSED + live → LIVE', () => {
    const slate = summarizeFixtureSlate([match('LIVE'), match('TBP')])
    const phase = resolveGameweekDisplayPhase({
      dashboardStatus: 'CLOSED',
      urgencyLevel: 'expired',
      slate,
    })
    assert.equal(phase, 'LIVE')
  })

  it('CLOSED + all FT → FINAL', () => {
    const slate = summarizeFixtureSlate([match('FT'), match('FT')])
    const phase = resolveGameweekDisplayPhase({
      dashboardStatus: 'CLOSED',
      urgencyLevel: 'expired',
      slate,
    })
    assert.equal(phase, 'FINAL')
  })

  it('CLOSED + only upcoming → PICKS_LOCKED', () => {
    const slate = summarizeFixtureSlate([match('TBP'), match('NS')])
    const phase = resolveGameweekDisplayPhase({
      dashboardStatus: 'CLOSED',
      urgencyLevel: 'expired',
      slate,
    })
    assert.equal(phase, 'PICKS_LOCKED')
  })

  it('OPEN + critical urgency → CLOSING_SOON', () => {
    const phase = resolveGameweekDisplayPhase({
      dashboardStatus: 'OPEN',
      urgencyLevel: 'critical',
      slate: emptySlate,
    })
    assert.equal(phase, 'CLOSING_SOON')
  })

  it('OPEN + normal urgency → OPEN', () => {
    const phase = resolveGameweekDisplayPhase({
      dashboardStatus: 'OPEN',
      urgencyLevel: 'normal',
      slate: emptySlate,
    })
    assert.equal(phase, 'OPEN')
  })

  it('COMPLETED and UPCOMING passthrough', () => {
    assert.equal(
      resolveGameweekDisplayPhase({
        dashboardStatus: 'COMPLETED',
        urgencyLevel: 'expired',
        slate: emptySlate,
      }),
      'COMPLETED'
    )
    assert.equal(
      resolveGameweekDisplayPhase({
        dashboardStatus: 'UPCOMING',
        urgencyLevel: 'normal',
        slate: emptySlate,
      }),
      'UPCOMING'
    )
  })
})