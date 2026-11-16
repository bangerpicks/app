/**
 * Seasons and precomputed standings (client read-only).
 */

import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { withTimeout } from './firestore-utils'
import { RankingEntry } from '@/types/dashboard'
import { Timestamp } from 'firebase/firestore'

export type SeasonStatus = 'upcoming' | 'active' | 'final'

export interface SeasonDocument {
  seasonId: string
  name: string
  name_esMX: string
  seasonNumber: number
  startAt: Timestamp
  endAt?: Timestamp
  gameweekIds: string[]
  bestN: number
  weekCount: number
  status: SeasonStatus
  createdAt: Timestamp
}

export interface SeasonRankingEntry extends RankingEntry {
  seasonPoints?: number
  totalCorrect?: number
  countingWeekIds?: string[]
}

export interface WeeklyStandingsDoc {
  gameweekId: string
  entries: Array<{
    uid: string
    displayName: string
    photoURL: string | null
    points: number
    correct: number
    rank: number
    isBot?: boolean
  }>
}

export async function getActiveSeason(): Promise<SeasonDocument | null> {
  try {
    const q = query(collection(db, 'seasons'), where('status', '==', 'active'), limit(1))
    const snapshot = await withTimeout(
      getDocs(q),
      10000,
      'Failed to load active season - request timed out'
    )
    if (snapshot.empty) {
      return null
    }
    const docSnap = snapshot.docs[0]
    const data = docSnap.data()
    return {
      seasonId: docSnap.id,
      name: data.name,
      name_esMX: data.name_esMX,
      seasonNumber: data.seasonNumber,
      startAt: data.startAt,
      endAt: data.endAt,
      gameweekIds: data.gameweekIds || [],
      bestN: data.bestN ?? 3,
      weekCount: data.weekCount ?? 6,
      status: data.status,
      createdAt: data.createdAt,
    }
  } catch (error) {
    console.error('[seasons] getActiveSeason:', error)
    return null
  }
}

export async function getSeasonById(seasonId: string): Promise<SeasonDocument | null> {
  try {
    const snap = await getDoc(doc(db, 'seasons', seasonId))
    if (!snap.exists()) {
      return null
    }
    const data = snap.data()
    return {
      seasonId: snap.id,
      name: data.name,
      name_esMX: data.name_esMX,
      seasonNumber: data.seasonNumber,
      startAt: data.startAt,
      endAt: data.endAt,
      gameweekIds: data.gameweekIds || [],
      bestN: data.bestN ?? 3,
      weekCount: data.weekCount ?? 6,
      status: data.status,
      createdAt: data.createdAt,
    }
  } catch (error) {
    console.error('[seasons] getSeasonById:', error)
    return null
  }
}

function mapWeeklyStandingsToRankingEntries(
  entries: WeeklyStandingsDoc['entries'],
  currentUserId?: string | null
): RankingEntry[] {
  return entries.map((entry) => ({
    userId: entry.uid,
    displayName: entry.displayName,
    photoURL: entry.photoURL,
    points: entry.points,
    weeklyPoints: entry.points,
    rank: entry.rank,
    isCurrentUser: currentUserId ? entry.uid === currentUserId : false,
  }))
}

export async function getPrecomputedWeeklyRankings(
  gameweekId: string,
  currentUserId?: string | null
): Promise<RankingEntry[] | null> {
  try {
    const snap = await getDoc(doc(db, 'weeklyStandings', gameweekId))
    if (!snap.exists()) {
      return null
    }
    const data = snap.data() as WeeklyStandingsDoc
    if (!Array.isArray(data.entries)) {
      return null
    }
    return mapWeeklyStandingsToRankingEntries(data.entries, currentUserId)
  } catch (error) {
    console.error('[seasons] getPrecomputedWeeklyRankings:', error)
    return null
  }
}

export async function getSeasonRankings(
  seasonId: string,
  currentUserId?: string | null
): Promise<SeasonRankingEntry[]> {
  try {
    const snap = await getDoc(doc(db, 'seasonStandings', seasonId))
    if (!snap.exists()) {
      return []
    }
    const data = snap.data()
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
  } catch (error) {
    console.error('[seasons] getSeasonRankings:', error)
    return []
  }
}

/** Resolve season display name from doc + locale. */
export function seasonDisplayName(season: SeasonDocument, locale: 'en' | 'es-MX'): string {
  if (locale === 'es-MX' && season.name_esMX) {
    return season.name_esMX
  }
  return season.name
}