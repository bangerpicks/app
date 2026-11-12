export type GameweekStatus = 'OPEN' | 'CLOSED' | 'UPCOMING' | 'COMPLETED'

export interface GameweekData {
  gameweekId: string
  name: string // "GAMEWEEK 5"
  playerCount: number // Total players who joined
  status: GameweekStatus
  deadline?: Date
  startDate?: Date
  endDate?: Date
  forceOpenForTesting?: boolean
}

export type Prediction = 'H' | 'D' | 'A' // Home, Draw, Away
export type OfficialConfidence = 'Strong' | 'Lean' | 'Toss-up'
export type FormResult = 'W' | 'D' | 'L' // Win, Draw, Loss

export interface TeamInfo {
  id: number
  name: string
  logo: string
  position?: number // League table rank when known
  form: FormResult[] // Last 5 matches
}

export interface MatchVenue {
  name: string
  city: string
}

export interface MarketOddsDecimal {
  home: number
  draw: number
  away: number
}

export interface MarketImpliedPercents {
  home: number
  draw: number
  away: number
}

/** Pre-match 1X2 snapshot persisted on gameweek fixture docs. */
export interface MarketOddsSnapshot {
  source: 'api-football'
  betId: 1
  bookmakerId: number
  bookmakerName: string
  decimalOdds: MarketOddsDecimal
  impliedPercents: MarketImpliedPercents
  overround: number
  apiUpdatedAt?: string
}

export interface MatchCardData {
  fixtureId: number
  league: {
    id: number
    name: string
    logo?: string
  }
  venue?: MatchVenue
  date: Date
  time: string // Formatted time
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  userPrediction?: Prediction | null
  matchStatus?: string // NS, 1H, HT, 2H, FT, LIVE, etc.
  minute?: number // Current minute of the match (for LIVE matches)
  stoppageTime?: number // Stoppage time in minutes (for LIVE matches)
  score?: {
    home: number
    away: number
  }
  whyItMatters?: string
  whyItMatters_esMX?: string
  officialPick?: Prediction
  officialConfidence?: OfficialConfidence
  marketOdds?: MarketOddsSnapshot
}

export type RankingView = 'all-time' | 'this-week' | 'past-weeks'

export interface MatchPrediction {
  fixtureId: number
  prediction: 'H' | 'D' | 'A' | null
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  correct?: boolean | null // Whether the prediction was correct (null if not yet determined)
}

export interface RankingEntry {
  userId: string
  displayName: string
  points: number
  rank: number
  totalPredictions?: number
  correctPredictions?: number
  accuracy?: number // Percentage (0-100)
  isCurrentUser?: boolean
  /** Profile/favorite player photo URL for avatar display */
  photoURL?: string | null
  // All-time: composite score for sort/display
  allTimeScore?: number
  // Last week podium (for "Last week champion" etc.); only show when lastCompletedGameweekId === latest completed gameweek
  lastWeekPlace?: 1 | 2 | 3 | null
  lastCompletedGameweekId?: string | null
  // Weekly rankings fields
  matchPredictions?: MatchPrediction[]
  weeklyPoints?: number
}

export interface GameweekRankingData {
  gameweek: GameweekData
  fixtures: Array<{
    fixtureId: number
    homeTeam: TeamInfo
    awayTeam: TeamInfo
  }>
}

export interface PastGameweekOption {
  gameweekId: string
  name: string
}