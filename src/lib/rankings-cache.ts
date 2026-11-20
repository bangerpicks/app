/**
 * Session cache for Rankings weekly + season data (successful server loads only).
 */

import { GameweekRankingData, RankingEntry } from '@/types/dashboard'
import { SeasonRankingEntry } from '@/lib/seasons'
import type { CompetitionTrackId } from '@/lib/competition-tracks'

export const RANKINGS_SESSION_CACHE_TTL_MS = 10 * 60 * 1000
export const RANKINGS_SESSION_CACHE_KEY_PREFIX = 'banger-picks-rankings-cache:v2'
const CACHE_VERSION = 2

type SerializedGameweekRankingData = {
  gameweek: Omit<GameweekRankingData['gameweek'], 'deadline' | 'startDate' | 'endDate'> & {
    deadline?: string
    startDate?: string
    endDate?: string
  }
  fixtures: GameweekRankingData['fixtures']
}

export interface RankingsSessionCache {
  version: typeof CACHE_VERSION
  savedAt: number
  locale: string
  uid: string | null
  currentGameweekId: string | null
  trackId?: CompetitionTrackId
  competitionId?: string
  gameweekData?: SerializedGameweekRankingData
  weeklyRankings?: RankingEntry[]
  seasonTitle?: string
  seasonRankings?: SeasonRankingEntry[]
}

export function rankingsSessionCacheKey(uid: string | null, locale: string): string {
  return `${RANKINGS_SESSION_CACHE_KEY_PREFIX}:${uid ?? 'anon'}:${locale}`
}

function serializeGameweekRankingData(
  data: GameweekRankingData
): SerializedGameweekRankingData {
  const { gameweek, fixtures } = data
  return {
    gameweek: {
      ...gameweek,
      deadline: gameweek.deadline?.toISOString(),
      startDate: gameweek.startDate?.toISOString(),
      endDate: gameweek.endDate?.toISOString(),
    },
    fixtures,
  }
}

function deserializeGameweekRankingData(
  raw: SerializedGameweekRankingData
): GameweekRankingData {
  const { gameweek, fixtures } = raw
  return {
    gameweek: {
      ...gameweek,
      deadline: gameweek.deadline ? new Date(gameweek.deadline) : undefined,
      startDate: gameweek.startDate ? new Date(gameweek.startDate) : undefined,
      endDate: gameweek.endDate ? new Date(gameweek.endDate) : undefined,
    },
    fixtures,
  }
}

function isFresh(savedAt: number, nowMs: number = Date.now()): boolean {
  return nowMs - savedAt <= RANKINGS_SESSION_CACHE_TTL_MS
}

export function readRankingsSessionCache(
  uid: string | null,
  locale: string
): RankingsSessionCache | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(rankingsSessionCacheKey(uid, locale))
    if (!raw) return null
    const parsed = JSON.parse(raw) as RankingsSessionCache
    if (parsed.version !== CACHE_VERSION || !isFresh(parsed.savedAt)) {
      sessionStorage.removeItem(rankingsSessionCacheKey(uid, locale))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeRankingsSessionCache(entry: RankingsSessionCache): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(
      rankingsSessionCacheKey(entry.uid, entry.locale),
      JSON.stringify({ ...entry, version: CACHE_VERSION, savedAt: Date.now() })
    )
  } catch {
    // quota / private mode
  }
}

export function clearRankingsSessionCache(uid: string | null, locale: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(rankingsSessionCacheKey(uid, locale))
  } catch {
    // ignore
  }
}

export function deserializeRankingsSessionGameweek(
  raw: SerializedGameweekRankingData | undefined
): GameweekRankingData | undefined {
  if (!raw) return undefined
  return deserializeGameweekRankingData(raw)
}

export function serializeRankingsSessionGameweek(
  data: GameweekRankingData | undefined
): SerializedGameweekRankingData | undefined {
  if (!data) return undefined
  return serializeGameweekRankingData(data)
}