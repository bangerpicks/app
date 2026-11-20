import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  filterGameweeksForTrack,
  listAvailableTracks,
  listPastGameweeksForTrack,
  pickCurrentGameweekForTrack,
  pickDefaultTrack,
  trackIdForGameweek,
} from '../src/lib/competition-tracks.mjs'

describe('competition tracks', () => {
  const catalog = [
    {
      gameweekId: 'gw-flag-active',
      name: 'Banger Week 3',
      type: 'banger-week',
      status: 'active',
      startDate: { toDate: () => new Date('2026-03-01') },
    },
    {
      gameweekId: 'gw-flag-old',
      name: 'Banger Week 2',
      type: 'flagship',
      status: 'completed',
      startDate: { toDate: () => new Date('2026-02-01') },
    },
    {
      gameweekId: 'gw-liga',
      name: 'Liga MX',
      type: 'league',
      status: 'active',
      startDate: { toDate: () => new Date('2026-03-05') },
    },
    {
      gameweekId: 'gw-draft',
      name: 'Draft',
      type: 'cup',
      status: 'draft',
      startDate: { toDate: () => new Date('2026-04-01') },
    },
  ]

  it('maps gameweek types to tracks', () => {
    assert.equal(trackIdForGameweek({ type: 'league' }), 'league')
    assert.equal(trackIdForGameweek({ type: 'cup' }), 'cup')
    assert.equal(trackIdForGameweek({ type: 'banger-week' }), 'banger-world')
  })

  it('lists tracks with non-draft slates only', () => {
    const tracks = listAvailableTracks(catalog)
    assert.deepEqual(tracks, ['banger-world', 'league'])
  })

  it('filters and picks current gameweek within track', () => {
    const flagship = filterGameweeksForTrack(catalog, 'banger-world')
    const current = pickCurrentGameweekForTrack(flagship)
    assert.equal(current?.gameweekId, 'gw-flag-active')
    const past = listPastGameweeksForTrack(flagship, current.gameweekId)
    assert.equal(past.length, 1)
    assert.equal(past[0].gameweekId, 'gw-flag-old')
  })

  it('defaults to banger-world when available', () => {
    assert.equal(pickDefaultTrack(['league', 'banger-world']), 'banger-world')
    assert.equal(pickDefaultTrack(['league']), 'league')
  })
})