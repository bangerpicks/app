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
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface CompetitionMembership {
  competitionId: string
  joinedAt: Timestamp
  role: 'member' | 'owner'
}

/** Card-ready row: competition + resolved gameweek for picks CTA. */
export interface CompetitionPlayCard {
  competition: CompetitionDocument
  gameweekId: string
  playerCount: number
}