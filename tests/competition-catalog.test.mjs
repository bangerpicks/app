import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  competitionIdForGameweek,
  filterGameweeksForCompetition,
  defaultCompetitionIdForLegacyTrack,
  pickDefaultCompetitionId,
  DEFAULT_FLAGSHIP_ID,
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