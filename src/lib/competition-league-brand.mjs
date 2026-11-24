/** API-Football league badge URLs (Next image domain allowlisted). */
export const API_SPORTS_LEAGUE_LOGO = (leagueId) =>
  `https://media.api-sports.io/football/leagues/${leagueId}.png`

export const LIGA_MX_LEAGUE_ID = 262

/**
 * @param {Array<{ league?: { id?: number, logo?: string, name?: string } }>} matches
 */
export function soleLeagueFromMatches(matches) {
  if (!matches?.length) return null
  const firstLeague = matches[0]?.league
  const leagueId = firstLeague?.id
  if (leagueId == null || !Number.isFinite(Number(leagueId))) return null

  for (const match of matches) {
    if (match?.league?.id !== leagueId) return null
  }

  const logo =
    firstLeague.logo?.trim() || API_SPORTS_LEAGUE_LOGO(Number(leagueId))
  return {
    id: Number(leagueId),
    name: firstLeague.name || '',
    logo,
  }
}

/**
 * @param {{
 *   competitionId?: string
 *   displayName?: string
 *   displayName_esMX?: string
 *   searchKeywords?: string[]
 *   primaryLeagueId?: number
 * } | null | undefined} competition
 */
export function inferLeagueBrandFromCompetition(competition) {
  if (!competition) return null

  if (
    competition.primaryLeagueId != null &&
    Number.isFinite(Number(competition.primaryLeagueId))
  ) {
    const id = Number(competition.primaryLeagueId)
    return {
      id,
      name: '',
      logo: API_SPORTS_LEAGUE_LOGO(id),
    }
  }

  const hay = [
    competition.competitionId,
    competition.displayName,
    competition.displayName_esMX,
    ...(competition.searchKeywords ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (/\bliga[\s_-]*mx\b|liguilla/.test(hay)) {
    return {
      id: LIGA_MX_LEAGUE_ID,
      name: 'Liga MX',
      logo: API_SPORTS_LEAGUE_LOGO(LIGA_MX_LEAGUE_ID),
    }
  }

  return null
}

/**
 * @param {Array<{ league?: { id?: number, logo?: string, name?: string } }>} matches
 * @param {Parameters<inferLeagueBrandFromCompetition>[0]} competition
 */
export function resolveCompetitionHeaderLeagueBrand(matches, competition) {
  return soleLeagueFromMatches(matches) ?? inferLeagueBrandFromCompetition(competition)
}