/**
 * Server-preferring season / weeklyStandings reads for Rankings (throws on failure).
 */

import { collection, doc, limit, query, where } from 'firebase/firestore'
import { db } from './firebase'
import {
  getDocSnapshotServerPreferring,
  getQuerySnapshotServerPreferring,
  LoadBudget,
  markServedFromCacheRef,
} from './firestore-server-read'
import { RankingEntry } from '@/types/dashboard'
import {
  SeasonDocument,
  SeasonRankingEntry,
  WeeklyStandingsDoc,
  seasonDisplayName,
} from './seasons'
import { rankingsHungReadGate } from './rankings-load-state.mjs'
import { normalizeProfilePhotoUrl } from './profile-photo.mjs'

export type RankingsSeasonReadContext = {
  budget: LoadBudget
  servedFromCacheRef?: { current: boolean }
}

function mapSeasonDoc(docSnap: { id: string; data: () => Record<string, unknown> }): SeasonDocument {
  const data = docSnap.data()
  return {
    seasonId: docSnap.id,
    name: data.name as string,
    name_esMX: data.name_esMX as string,
    seasonNumber: data.seasonNumber as number,
    startAt: data.startAt as SeasonDocument['startAt'],
    endAt: data.endAt as SeasonDocument['endAt'],
    gameweekIds: (data.gameweekIds as string[]) || [],
    bestN: (data.bestN as number) ?? 3,
    weekCount: (data.weekCount as number) ?? 6,
    status: data.status as SeasonDocument['status'],
    createdAt: data.createdAt as SeasonDocument['createdAt'],
  }
}

function mapWeeklyStandingsToRankingEntries(
  entries: WeeklyStandingsDoc['entries'],
  currentUserId?: string | null
): RankingEntry[] {
  return entries.map((entry) => ({
    userId: entry.uid,
    displayName: entry.displayName,
    photoURL: normalizeProfilePhotoUrl(entry.photoURL),
    points: entry.points,
    weeklyPoints: entry.points,
    rank: entry.rank,
    isCurrentUser: currentUserId ? entry.uid === currentUserId : false,
  }))
}

export async function fetchActiveSeasonForRankings(
  ctx: RankingsSeasonReadContext
): Promise<SeasonDocument | null> {
  await rankingsHungReadGate('activeSeason', {
    budgetRemainingMs: ctx.budget.remaining(),
  })
  const q = query(collection(db, 'seasons'), where('status', '==', 'active'), limit(1))
  const result = await getQuerySnapshotServerPreferring(q, {
    budget: ctx.budget,
    timeoutMessage: 'Failed to load active season',
  })
  markServedFromCacheRef(ctx.servedFromCacheRef, result)
  if (result.data.empty) {
    return null
  }
  return mapSeasonDoc(result.data.docs[0])
}

export async function fetchPrecomputedWeeklyRankingsForRankings(
  gameweekId: string,
  currentUserId: string | null | undefined,
  ctx: RankingsSeasonReadContext
): Promise<RankingEntry[] | null> {
  await rankingsHungReadGate('weeklyStandings', {
    budgetRemainingMs: ctx.budget.remaining(),
  })
  const docRef = doc(db, 'weeklyStandings', gameweekId)
  const result = await getDocSnapshotServerPreferring(docRef, {
    budget: ctx.budget,
    timeoutMessage: 'Failed to load weekly standings',
  })
  markServedFromCacheRef(ctx.servedFromCacheRef, result)
  if (!result.data.exists()) {
    return null
  }
  const data = result.data.data() as WeeklyStandingsDoc
  if (!Array.isArray(data.entries)) {
    return null
  }
  return mapWeeklyStandingsToRankingEntries(data.entries, currentUserId)
}

export async function fetchSeasonRankingsForRankings(
  seasonId: string,
  currentUserId: string | null | undefined,
  ctx: RankingsSeasonReadContext
): Promise<SeasonRankingEntry[]> {
  await rankingsHungReadGate('seasonStandings', {
    budgetRemainingMs: ctx.budget.remaining(),
  })
  const docRef = doc(db, 'seasonStandings', seasonId)
  const result = await getDocSnapshotServerPreferring(docRef, {
    budget: ctx.budget,
    timeoutMessage: 'Failed to load season standings',
  })
  markServedFromCacheRef(ctx.servedFromCacheRef, result)
  if (!result.data.exists()) {
    return []
  }
  const data = result.data.data()
  const entries = Array.isArray(data.entries) ? data.entries : []
  return entries.map(
    (entry: {
      uid: string
      displayName: string
      photoURL: string | null
      seasonPoints: number
      totalCorrect: number
      rank: number
      countingWeekIds?: string[]
    }) => ({
      userId: entry.uid,
      displayName: entry.displayName,
      photoURL: entry.photoURL,
      points: entry.seasonPoints,
      seasonPoints: entry.seasonPoints,
      totalCorrect: entry.totalCorrect,
      countingWeekIds: entry.countingWeekIds,
      rank: entry.rank,
      isCurrentUser: currentUserId ? entry.uid === currentUserId : false,
    })
  )
}

export { seasonDisplayName }