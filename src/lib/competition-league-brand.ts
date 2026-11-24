export {
  API_SPORTS_LEAGUE_LOGO,
  LIGA_MX_LEAGUE_ID,
  inferLeagueBrandFromCompetition,
  resolveCompetitionHeaderLeagueBrand,
  soleLeagueFromMatches,
} from '@/lib/competition-league-brand.mjs'

export type CompetitionLeagueBrand = {
  id: number
  name: string
  logo: string
}