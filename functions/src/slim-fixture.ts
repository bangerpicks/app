import type { APIFootballFixture } from './api-football-types'

/** Client-facing fixture payload (no players, lineups, events, statistics). */
export function slimApiFootballFixture(full: APIFootballFixture): APIFootballFixture {
  return {
    fixture: full.fixture,
    league: full.league,
    teams: full.teams,
    goals: full.goals,
    score: full.score,
  }
}

export function fixtureLiveFieldsSig(fixture: APIFootballFixture): string {
  const s = fixture.fixture?.status
  const g = fixture.goals
  return JSON.stringify({
    st: s?.short,
    el: s?.elapsed ?? null,
    gh: g?.home ?? null,
    ga: g?.away ?? null,
  })
}