import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  inferLeagueBrandFromCompetition,
  resolveCompetitionHeaderLeagueBrand,
  soleLeagueFromMatches,
  LIGA_MX_LEAGUE_ID,
} from '../src/lib/competition-league-brand.mjs'

test('sole league when all fixtures share one league', () => {
  const brand = soleLeagueFromMatches([
    { league: { id: 262, name: 'Liga MX', logo: 'https://cdn.example/liga.png' } },
    { league: { id: 262, name: 'Liga MX', logo: 'https://cdn.example/liga.png' } },
  ])
  assert.equal(brand.id, 262)
  assert.equal(brand.logo, 'https://cdn.example/liga.png')
})

test('no sole league when fixtures mix competitions', () => {
  const brand = soleLeagueFromMatches([
    { league: { id: 262, name: 'Liga MX' } },
    { league: { id: 39, name: 'Premier League' } },
  ])
  assert.equal(brand, null)
})

test('infer Liga MX from competition naming', () => {
  const brand = inferLeagueBrandFromCompetition({
    competitionId: 'liguilla-2026',
    displayName: 'Liguilla Liga MX',
  })
  assert.equal(brand.id, LIGA_MX_LEAGUE_ID)
  assert.match(brand.logo, /leagues\/262\.png/)
})

test('fixtures win over competition inference', () => {
  const brand = resolveCompetitionHeaderLeagueBrand(
    [{ league: { id: 39, name: 'PL', logo: 'https://cdn.example/pl.png' } }],
    { competitionId: 'liga-mx', displayName: 'Liga MX' }
  )
  assert.equal(brand.id, 39)
})