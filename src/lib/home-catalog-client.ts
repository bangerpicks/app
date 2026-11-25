/**
 * Read pre-built Home catalog doc (catalog/homePlay) written by Cloud Functions.
 */

import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { CompetitionDocument, CompetitionPlayCard } from '@/types/competition'
import type { GameweekData } from '@/types/dashboard'
import { refreshPicksStatusFromDeadline } from '@/lib/gameweek-selection'

export const HOME_PLAY_CATALOG_PATH = 'catalog/homePlay'

type SlimGameweekCard = {
  gameweekId: string
  name: string
  playerCount: number
  status: string
  deadlineMs: number | null
  startDateMs: number | null
  endDateMs: number | null
  forceOpenForTesting?: boolean
  type?: string
  description?: string
  weekNumber?: number
}

type HomePlayCardRaw = {
  competitionId: string
  competition: Record<string, unknown>
  gameweekId: string
  playerCount: number
  gameweek: SlimGameweekCard
}

export type HomePlayCatalogPayload = {
  version: number
  signature: string
  cards: CompetitionPlayCard[]
  comingSoon: CompetitionDocument[]
  gameweeksById: Map<string, GameweekData>
}

function slimToGameweekData(slim: SlimGameweekCard): GameweekData {
  return refreshPicksStatusFromDeadline({
    gameweekId: slim.gameweekId,
    name: slim.name,
    playerCount: slim.playerCount,
    status: slim.status as GameweekData['status'],
    deadline: slim.deadlineMs != null ? new Date(slim.deadlineMs) : undefined,
    startDate: slim.startDateMs != null ? new Date(slim.startDateMs) : undefined,
    endDate: slim.endDateMs != null ? new Date(slim.endDateMs) : undefined,
    forceOpenForTesting: slim.forceOpenForTesting,
    type: slim.type as GameweekData['type'],
    description: slim.description,
    weekNumber: slim.weekNumber,
  })
}

function mapCompetition(raw: Record<string, unknown>, competitionId: string): CompetitionDocument {
  return {
    competitionId,
    displayName: (raw.displayName as string) || competitionId,
    displayName_esMX: raw.displayName_esMX as string | undefined,
    kind: (raw.kind as CompetitionDocument['kind']) || 'community',
    visibility: (raw.visibility as CompetitionDocument['visibility']) || 'public',
    featured: raw.featured as boolean | undefined,
    featuredRank: raw.featuredRank as number | undefined,
    activeGameweekId: (raw.activeGameweekId as string) ?? null,
    status: (raw.status as CompetitionDocument['status']) || 'active',
    opensAt: raw.opensAt as CompetitionDocument['opensAt'],
    tagline: raw.tagline as string | undefined,
    tagline_esMX: raw.tagline_esMX as string | undefined,
    primaryLeagueId: raw.primaryLeagueId as number | undefined,
    memberCount: raw.memberCount as number | undefined,
  }
}

export function parseHomePlayCatalog(data: Record<string, unknown> | undefined): HomePlayCatalogPayload | null {
  if (!data || !Array.isArray(data.cards)) return null
  const cardsRaw = data.cards as HomePlayCardRaw[]
  const gameweeksById = new Map<string, GameweekData>()
  const cards: CompetitionPlayCard[] = []

  for (const row of cardsRaw) {
    if (!row?.gameweekId || !row.gameweek) continue
    const competition = mapCompetition(
      (row.competition as Record<string, unknown>) || {},
      row.competitionId ||
        (typeof row.competition?.competitionId === 'string' ? row.competition.competitionId : '') ||
        ''
    )
    const gw = slimToGameweekData(row.gameweek)
    gameweeksById.set(gw.gameweekId, gw)
    cards.push({
      competition,
      gameweekId: row.gameweekId,
      playerCount: row.playerCount ?? gw.playerCount ?? 0,
    })
  }

  const comingSoon = Array.isArray(data.comingSoon)
    ? (data.comingSoon as Record<string, unknown>[]).map((c) =>
        mapCompetition(c, (c.competitionId as string) || '')
      )
    : []

  return {
    version: typeof data.version === 'number' ? data.version : 0,
    signature: typeof data.signature === 'string' ? data.signature : '',
    cards,
    comingSoon,
    gameweeksById,
  }
}

export async function fetchHomePlayCatalog(): Promise<HomePlayCatalogPayload | null> {
  const snap = await getDoc(doc(db, 'catalog', 'homePlay'))
  if (!snap.exists()) return null
  return parseHomePlayCatalog(snap.data() as Record<string, unknown>)
}

export function playCardFromCompetitionDoc(
  competition: CompetitionDocument,
  playCard: { gameweekId: string; playerCount: number; gameweek?: SlimGameweekCard }
): { card: CompetitionPlayCard; gameweek: GameweekData } | null {
  if (!playCard?.gameweekId || !playCard.gameweek) return null
  const gw = slimToGameweekData(playCard.gameweek as SlimGameweekCard)
  return {
    card: {
      competition,
      gameweekId: playCard.gameweekId,
      playerCount: playCard.playerCount ?? gw.playerCount ?? 0,
    },
    gameweek: gw,
  }
}

export type HomeMembershipSnapshot = {
  competitionIds: string[]
  dismissedCompetitionIds: string[]
}

export async function fetchHomeMembershipIds(uid: string): Promise<string[]> {
  const summary = await fetchHomeMembershipSummary(uid)
  return summary.competitionIds
}

export async function fetchHomeMembershipSummary(uid: string): Promise<HomeMembershipSnapshot> {
  const snap = await getDoc(doc(db, 'users', uid, 'homeMembership', 'summary'))
  if (!snap.exists()) {
    return { competitionIds: [], dismissedCompetitionIds: [] }
  }
  const data = snap.data()
  const competitionIds = Array.isArray(data?.competitionIds)
    ? data.competitionIds.filter((id): id is string => typeof id === 'string')
    : []
  const dismissedCompetitionIds = Array.isArray(data?.dismissedCompetitionIds)
    ? data.dismissedCompetitionIds.filter((id): id is string => typeof id === 'string')
    : []
  return { competitionIds, dismissedCompetitionIds }
}