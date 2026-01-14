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
export type FormResult = 'W' | 'D' | 'L' // Win, Draw, Loss

export interface TeamInfo {
  id: number
  name: string
  logo: string
  position: number // League position
  form: FormResult[] // Last 5 matches
}

export interface MatchCardData {
  fixtureId: number
  league: {
    id: number
    name: string
    logo?: string
  }
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
}

export type RankingView = 'all-time' | 'this-week'

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