/**
 * API-Football types and admin client wrappers.
 * All HTTP calls go through the adminApiFootball callable (key stays on Cloud Functions).
 */

import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import { getCachedFixtureSearch, saveCachedFixtureSearch } from './admin'

/**
 * Fixture data structure from API-Football
 */
export interface APIFootballFixture {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    venue: {
      id: number | null
      name: string
      city: string
    }
    status: {
      long: string
      short: string
      elapsed: number | null
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string | null
    season: number
    round: string
  }
  teams: {
    home: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
    away: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: {
      home: number | null
      away: number | null
    }
    fulltime: {
      home: number | null
      away: number | null
    }
    extratime: {
      home: number | null
      away: number | null
    }
    penalty: {
      home: number | null
      away: number | null
    }
  }
}

export interface APIFootballLeague {
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string | null
  }
  seasons: Array<{
    year: number
    start: string
    end: string
    current: boolean
  }>
}

export interface PlayerSearchResult {
  playerId: number
  name: string
  photo: string
  teamName?: string
}

async function callAdminApiFootball<T>(payload: Record<string, unknown>): Promise<T> {
  const fn = httpsCallable<Record<string, unknown>, T>(functions, 'adminApiFootball')
  const result = await fn(payload)
  return result.data
}

function calculateSeason(dateString: string): number {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return month >= 8 ? year : year - 1
}

export async function searchFixtures(params: {
  from: string
  to: string
  league?: number
  team?: number
  status?: string
  timezone?: string
  season?: number
}): Promise<APIFootballFixture[]> {
  try {
    if (!params.team && !params.status) {
      const cached = await getCachedFixtureSearch(params.from, params.to, params.league)
      if (cached) {
        return cached
      }
    }

    const season = params.league ? params.season ?? calculateSeason(params.from) : params.season
    const { fixtures } = await callAdminApiFootball<{ fixtures: APIFootballFixture[] }>({
      action: 'searchFixtures',
      ...params,
      season,
    })

    if (!params.team && !params.status && fixtures.length > 0) {
      await saveCachedFixtureSearch(params.from, params.to, params.league, fixtures)
    }

    return fixtures
  } catch (error) {
    console.error('[api-football] Error searching fixtures:', error)
    throw error
  }
}

export async function getStandings(
  leagueId: number,
  season: number
): Promise<
  Array<{
    team: { id: number; name: string; logo: string }
    rank: number
    points: number
    goalsDiff: number
    form: string
  }>
> {
  try {
    const { standings } = await callAdminApiFootball<{
      standings: Array<{
        team: { id: number; name: string; logo: string }
        rank: number
        points: number
        goalsDiff: number
        form: string
      }>
    }>({
      action: 'getStandings',
      leagueId,
      season,
    })
    return standings
  } catch (error) {
    console.error('[api-football] Error fetching standings:', error)
    return []
  }
}

export function getMajorLeagues(): Array<{ id: number; name: string; country: string }> {
  return [
    { id: 39, name: 'Premier League', country: 'England' },
    { id: 140, name: 'La Liga', country: 'Spain' },
    { id: 78, name: 'Bundesliga', country: 'Germany' },
    { id: 135, name: 'Serie A', country: 'Italy' },
    { id: 61, name: 'Ligue 1', country: 'France' },
    { id: 2, name: 'UEFA Champions League', country: 'Europe' },
    { id: 203, name: 'Süper Lig', country: 'Turkey' },
    { id: 262, name: 'Liga MX', country: 'Mexico' },
    { id: 253, name: 'MLS', country: 'USA' },
    { id: 88, name: 'Eredivisie', country: 'Netherlands' },
    { id: 71, name: 'Serie A', country: 'Brazil' },
    { id: 235, name: 'Premier League', country: 'Russia' },
    { id: 307, name: 'Saudi Pro League', country: 'Saudi Arabia' },
  ]
}

export async function searchPlayers(
  query: string,
  league?: number,
  season?: number
): Promise<PlayerSearchResult[]> {
  try {
    const trimmed = query?.trim()
    if (!trimmed || trimmed.length < 3) {
      return []
    }

    const { players } = await callAdminApiFootball<{ players: PlayerSearchResult[] }>({
      action: 'searchPlayers',
      query: trimmed,
      league,
      season,
    })

    return players
  } catch (error) {
    console.error('[api-football] Error searching players:', error)
    throw error
  }
}
