import type { Timestamp } from 'firebase/firestore'

export type CompetitionKind = 'flagship' | 'league' | 'cup' | 'community'
export type CompetitionVisibility = 'public' | 'unlisted' | 'private'
export type CompetitionStatus = 'active' | 'paused' | 'archived'

export interface CompetitionDocument {
  competitionId: string
  displayName: string
  displayName_esMX?: string
  kind: CompetitionKind
  visibility: CompetitionVisibility
  joinCode?: string
  joinCodeEnabled?: boolean
  maxMembers?: number
  memberCount?: number
  featured?: boolean
  featuredRank?: number
  activeGameweekId?: string | null
  status: CompetitionStatus
  ownerUid?: string
  activeSeasonId?: string | null
  searchKeywords?: string[]
  /** When set (and no active round yet), Home/Discover show a Coming Soon card. */
  opensAt?: Timestamp | null
  tagline?: string
  tagline_esMX?: string
  /** When set, card header uses this league badge (e.g. Liga MX = 262). */
  primaryLeagueId?: number
  /** Denormalized round card (written by catalog rebuild). */
  playCard?: {
    gameweekId: string
    playerCount: number
    gameweek?: Record<string, unknown>
    updatedAt?: Timestamp
  }
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export type CompetitionJoinVia = 'default' | 'discover' | 'code'

export interface CompetitionMembership {
  competitionId: string
  joinedAt: Timestamp
  role: 'member' | 'owner'
  joinedVia?: CompetitionJoinVia
  /** Set when user leaves during locked/live; finalized when GW completes. */
  pendingLeaveGameweekId?: string | null
}

export interface HomeMembershipSummary {
  competitionIds: string[]
  dismissedCompetitionIds?: string[]
  updatedAt?: Timestamp
}

/** Card-ready row: competition + resolved gameweek for picks CTA. */
export interface CompetitionPlayCard {
  competition: CompetitionDocument
  gameweekId: string
  playerCount: number
  /** Matches active GW when leave is deferred until week ends. */
  pendingLeaveGameweekId?: string | null
}