import { apiFootballGet } from './api-football-client'
import type { APIFootballFixture } from './api-football-types'

function calculateSeason(dateString: string): number {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return month >= 8 ? year : year - 1
}

export async function adminSearchFixtures(
  apiKey: string,
  params: {
    from: string
    to: string
    league?: number
    team?: number
    status?: string
    timezone?: string
    season?: number
  }
): Promise<APIFootballFixture[]> {
  const apiParams: Record<string, string | number | undefined> = {
    from: params.from,
    to: params.to,
  }

  if (params.league) {
    apiParams.league = params.league
    apiParams.season = params.season ?? calculateSeason(params.from)
  }
  if (params.team) {
    apiParams.team = params.team
  }
  if (params.status) {
    apiParams.status = params.status
  }
  if (params.timezone) {
    apiParams.timezone = params.timezone
  }

  const data = (await apiFootballGet(apiKey, '/fixtures', apiParams)) as { response?: APIFootballFixture[] }
  return data.response || []
}

export async function adminGetStandings(
  apiKey: string,
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
  const data = (await apiFootballGet(apiKey, '/standings', { league: leagueId, season })) as {
    response?: Array<{ league?: { standings?: Array<Array<Record<string, unknown>>> } }>
  }

  const standings = data.response?.[0]?.league?.standings?.[0] || []

  return standings.map((team: Record<string, unknown>) => {
    const teamInfo = team.team as { id: number; name: string; logo: string }
    return {
      team: {
        id: teamInfo.id,
        name: teamInfo.name,
        logo: teamInfo.logo,
      },
      rank: team.rank as number,
      points: team.points as number,
      goalsDiff: team.goalsDiff as number,
      form: (team.form as string) || '',
    }
  })
}

export interface PlayerSearchResult {
  playerId: number
  name: string
  photo: string
  teamName?: string
}

export async function adminSearchPlayers(
  apiKey: string,
  query: string,
  league?: number,
  season?: number
): Promise<PlayerSearchResult[]> {
  const trimmed = query?.trim()
  if (!trimmed || trimmed.length < 3) {
    return []
  }

  const params: Record<string, string | number | undefined> = { search: trimmed }
  if (league) params.league = league
  if (season) params.season = season

  const data = (await apiFootballGet(apiKey, '/players', params)) as {
    response?: Array<{
      player: { id: number; name: string; photo: string }
      statistics?: Array<{ team?: { name?: string } }>
    }>
  }

  const items = data.response || []
  const results: PlayerSearchResult[] = items.map((item) => ({
    playerId: item.player.id,
    name: item.player.name,
    photo: item.player.photo || `https://media.api-sports.io/football/players/${item.player.id}.png`,
    teamName: item.statistics?.[0]?.team?.name,
  }))

  const seen = new Set<number>()
  return results.filter((r) => {
    if (seen.has(r.playerId)) return false
    seen.add(r.playerId)
    return true
  })
}
