import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  competitionIdForGameweek,
  filterGameweeksForCompetition,
  defaultCompetitionIdForLegacyTrack,
  pickDefaultCompetitionId,
  DEFAULT_FLAGSHIP_ID,
  isCompetitionComingSoon,
  comingSoonCountdown,
  formatComingSoonCountdown,
} from '../src/lib/competition-catalog.mjs'

describe('competition-catalog', () => {
  it('defaults flagship gameweeks to banger-world', () => {
    assert.equal(
      competitionIdForGameweek({ gameweekId: 'gw-1', type: 'flagship' }),
      DEFAULT_FLAGSHIP_ID
    )
  })

  it('filters gameweeks by competition id', () => {
    const all = [
      { gameweekId: 'a', type: 'league', competitionId: 'liga-mx' },
      { gameweekId: 'b', type: 'flagship', competitionId: DEFAULT_FLAGSHIP_ID },
    ]
    assert.equal(filterGameweeksForCompetition(all, 'liga-mx').length, 1)
  })

  it('maps legacy league track to first league competition', () => {
    const all = [{ gameweekId: 'gw-l', type: 'league', status: 'active' }]
    assert.equal(defaultCompetitionIdForLegacyTrack('league', all), 'league-gw-l')
  })

  it('pickDefaultCompetitionId prefers flagship', () => {
    assert.equal(pickDefaultCompetitionId(['liga', DEFAULT_FLAGSHIP_ID]), DEFAULT_FLAGSHIP_ID)
  })
})

describe('coming-soon competitions', () => {
  const opensAt = { toDate: () => new Date('2026-11-24T02:00:00Z') }
  const base = { status: 'active', visibility: 'public', activeGameweekId: null, opensAt }

  it('requires active, public, no round, and opensAt', () => {
    assert.equal(isCompetitionComingSoon(base), true)
    assert.equal(isCompetitionComingSoon({ ...base, opensAt: null }), false)
    assert.equal(isCompetitionComingSoon({ ...base, activeGameweekId: 'gw-1' }), false)
    assert.equal(isCompetitionComingSoon({ ...base, visibility: 'private' }), false)
    assert.equal(isCompetitionComingSoon({ ...base, status: 'paused' }), false)
    assert.equal(isCompetitionComingSoon({ ...base, opensAt: { seconds: 1795485600 } }), true)
  })

  it('counts down in d/h/m, rounding up to the minute', () => {
    const now = Date.UTC(2026, 10, 21, 21, 47, 30)
    const target = now + ((2 * 24 + 4) * 60 + 12) * 60000 - 30000
    assert.deepEqual(comingSoonCountdown(target, now), { days: 2, hours: 4, minutes: 12 })
    assert.equal(formatComingSoonCountdown({ days: 2, hours: 4, minutes: 12 }), '2d 4h 12m')
    assert.equal(formatComingSoonCountdown({ days: 0, hours: 0, minutes: 5 }), '5m')
    assert.equal(formatComingSoonCountdown({ days: 1, hours: 0, minutes: 0 }), '1d 0h 0m')
  })

  it('returns null once opensAt has passed', () => {
    assert.equal(comingSoonCountdown(1000, 1000), null)
    assert.equal(comingSoonCountdown(1000, 5000), null)
  })
})