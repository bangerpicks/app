import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  inferWeekNumber,
  normalizeGameweekType,
  resolveGameweekCardBranding,
} from '../src/lib/gameweek-card-branding.mjs'

const copy = {
  flagshipTitle: 'Banger World Weekend',
  flagshipSubtitle: 'Flagship subtitle',
  leagueSubtitle: 'League subtitle',
  cupSubtitle: 'Cup subtitle',
  edition: (week) => `Week ${week}`,
}

describe('gameweek card branding', () => {
  it('flagship uses world title, edition, and globe icon', () => {
    const branding = resolveGameweekCardBranding(
      { name: 'Banger Week 2', type: 'banger-week', weekNumber: 2 },
      copy
    )
    assert.equal(branding.icon, 'globe')
    assert.equal(branding.title, 'Banger World Weekend')
    assert.equal(branding.edition, 'Week 2')
    assert.equal(branding.subtitle, 'Flagship subtitle')
  })

  it('infers week number from legacy name when weekNumber missing', () => {
    assert.equal(inferWeekNumber({ name: 'Banger Week 2' }), 2)
    assert.equal(inferWeekNumber({ name: 'WK 11' }), 11)
  })

  it('league and cup use gameweek name and matching icons', () => {
    const league = resolveGameweekCardBranding(
      { name: 'Liga MX', type: 'league' },
      copy
    )
    assert.equal(league.icon, 'trophy')
    assert.equal(league.title, 'Liga MX')

    const cup = resolveGameweekCardBranding(
      { name: 'Weekday Extravaganza', type: 'cup' },
      copy
    )
    assert.equal(cup.icon, 'medal')
    assert.equal(cup.title, 'Weekday Extravaganza')
  })

  it('prefers admin description as subtitle', () => {
    const branding = resolveGameweekCardBranding(
      {
        name: 'Banger Week 2',
        type: 'flagship',
        description: 'Custom admin pitch',
      },
      copy
    )
    assert.equal(branding.subtitle, 'Custom admin pitch')
  })

  it('normalizes banger-week to flagship', () => {
    assert.equal(normalizeGameweekType('banger-week'), 'flagship')
    assert.equal(normalizeGameweekType(undefined), 'flagship')
  })
})