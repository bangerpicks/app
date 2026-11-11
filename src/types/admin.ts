/**
 * Admin-specific types for gameweek management
 */

import { Timestamp } from 'firebase/firestore'
import { APIFootballFixture } from '@/lib/api-football'

/**
 * Gameweek status for admin management
 */
export type GameweekStatus = 'draft' | 'active' | 'completed' | 'archived'

export type GameweekType = 'banger-week' | 'league' | 'cup' | 'flagship'

/**
 * Standings data for a league
 */
export interface LeagueStandings {
  team: { id: number; name: string; logo: string }
  rank: number
  points: number
  goalsDiff: number
  form: string // e.g., "WWDLW"
}

/**
 * Full gameweek data structure for admin
 */
export interface AdminGameweekData {
  gameweekId: string
  name: string
  description?: string
  startDate: Timestamp
  endDate: Timestamp
  deadline: Timestamp
  status: GameweekStatus
  fixtureIds: number[]
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  forceOpenForTesting?: boolean
  playerCount?: number
  standings?: {
    [leagueId: string]: LeagueStandings[]
  }
  standingsFetchedAt?: Timestamp
  /** flagship default when omitted */
  type?: GameweekType
  weekNumber?: number
  openAt?: Timestamp
  lockAt?: Timestamp
  endAt?: Timestamp
  podiumAwardedAt?: Timestamp
}

/**
 * Gameweek fixture subcollection data
 */
export interface GameweekFixtureData {
  fixtureId: number
  fixture: APIFootballFixture
  teams: {
    home: {
      id: number
      name: string
      logo: string
    }
    away: {
      id: number
      name: string
      logo: string
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
  }
  addedBy: string
  addedAt: Timestamp
  whyItMatters?: string
}

/**
 * Input data for creating a gameweek
 */
export interface CreateGameweekData {
  name: string
  description?: string
  startDate: Date
  endDate: Date
  deadline: Date
  status: GameweekStatus
  fixtureIds: number[]
  createdBy: string
  forceOpenForTesting?: boolean
  type?: GameweekType
  weekNumber?: number
  openAt?: Date
  lockAt?: Date
  endAt?: Date
}

/**
 * Filter options for gameweek list
 */
export interface GameweekFilters {
  status?: GameweekStatus
  sortBy?: 'date' | 'name'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Gameweek form data (for form state)
 */
export interface GameweekFormData {
  name: string
  description: string
  startDate: string // ISO string for datetime-local input
  endDate: string // ISO string for datetime-local input
  deadline: string // ISO string for datetime-local input
  status: GameweekStatus
  selectedFixtures: APIFootballFixture[]
}
