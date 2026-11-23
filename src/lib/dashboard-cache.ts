/**
 * Session cache for dashboard gameweek + fixtures so slow networks can show the last good load.
 */

import { GameweekData, MatchCardData } from '@/types/dashboard'
import { refreshPicksStatusFromDeadline } from '@/lib/gameweek-selection'

export const DASHBOARD_SESSION_CACHE_TTL_MS = 10 * 60 * 1000
export const DASHBOARD_SESSION_CACHE_KEY_PREFIX = 'banger-picks-dashboard-cache:v1'
const CACHE_VERSION = 1

type SerializedGameweekData = Omit<GameweekData, 'deadline' | 'startDate' | 'endDate'> & {
  deadline?: string
  startDate: string
  endDate: string
}

type SerializedMatchCardData = Omit<MatchCardData, 'date'> & {
  date: string
}

export interface DashboardSessionCache {
  version: typeof CACHE_VERSION
  savedAt: number
  gameweekId: string
  gameweek: GameweekData
  matches: MatchCardData[]
  locale: string
  uid: string | null
}

export function dashboardSessionCacheKey(uid: string | null, locale: string): string {
  return `${DASHBOARD_SESSION_CACHE_KEY_PREFIX}:${uid ?? 'anon'}:${locale}`
}

function serializeGameweek(gw: GameweekData): SerializedGameweekData {
  return {
    ...gw,
    deadline: gw.deadline?.toISOString(),
    startDate: gw.startDate?.toISOString() ?? '',
    endDate: gw.endDate?.toISOString() ?? '',
  }
}

function deserializeGameweek(raw: SerializedGameweekData): GameweekData {
  return refreshPicksStatusFromDeadline({
    ...raw,
    deadline: raw.deadline ? new Date(raw.deadline) : undefined,
    startDate: raw.startDate ? new Date(raw.startDate) : undefined,
    endDate: raw.endDate ? new Date(raw.endDate) : undefined,
  })
}

function serializeMatch(match: MatchCardData): SerializedMatchCardData {
  return {
    ...match,
    date: match.date.toISOString(),
  }
}

function deserializeMatch(raw: SerializedMatchCardData): MatchCardData {
  return {
    ...raw,
    date: new Date(raw.date),
  }
}

function isCacheEntryFresh(savedAt: number, nowMs: number = Date.now()): boolean {
  return nowMs - savedAt <= DASHBOARD_SESSION_CACHE_TTL_MS
}

export function readDashboardSessionCache(
  uid: string | null,
  locale: string
): DashboardSessionCache | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  try {
    const key = dashboardSessionCacheKey(uid, locale)
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      version: number
      savedAt: number
      gameweekId: string
      gameweek: SerializedGameweekData
      matches: SerializedMatchCardData[]
      locale?: string
      uid?: string | null
    }
    if (parsed.version !== CACHE_VERSION) return null
    if (!isCacheEntryFresh(parsed.savedAt)) {
      sessionStorage.removeItem(key)
      return null
    }
    return {
      version: CACHE_VERSION,
      savedAt: parsed.savedAt,
      gameweekId: parsed.gameweekId,
      gameweek: deserializeGameweek(parsed.gameweek),
      matches: parsed.matches.map(deserializeMatch),
      locale: parsed.locale ?? locale,
      uid: parsed.uid ?? uid,
    }
  } catch {
    return null
  }
}

export function writeDashboardSessionCache(
  uid: string | null,
  locale: string,
  payload: Omit<DashboardSessionCache, 'version' | 'savedAt' | 'locale' | 'uid'>
): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    const body = {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      gameweekId: payload.gameweekId,
      gameweek: serializeGameweek(payload.gameweek),
      matches: payload.matches.map(serializeMatch),
      locale,
      uid,
    }
    sessionStorage.setItem(dashboardSessionCacheKey(uid, locale), JSON.stringify(body))
  } catch {
    // Quota or private mode — ignore
  }
}

export function clearDashboardSessionCache(uid: string | null, locale: string): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    sessionStorage.removeItem(dashboardSessionCacheKey(uid, locale))
  } catch {
    /* ignore */
  }
}

/**
 * Update playerCount on a cached gameweek when the user joins mid-session
 * (so a reload within the TTL does not replay a stale 0).
 */
export function patchDashboardSessionGameweekPlayerCount(
  uid: string | null,
  locale: string,
  gameweekId: string,
  playerCount: number
): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    const key = dashboardSessionCacheKey(uid, locale)
    const raw = sessionStorage.getItem(key)
    if (!raw) return
    const parsed = JSON.parse(raw) as {
      version: number
      savedAt: number
      gameweekId: string
      gameweek: SerializedGameweekData
      matches: SerializedMatchCardData[]
      locale?: string
      uid?: string | null
    }
    if (parsed.version !== CACHE_VERSION) return
    if (!isCacheEntryFresh(parsed.savedAt)) {
      sessionStorage.removeItem(key)
      return
    }
    if (parsed.gameweekId !== gameweekId) return
    parsed.gameweek = { ...parsed.gameweek, playerCount }
    sessionStorage.setItem(key, JSON.stringify(parsed))
  } catch {
    /* ignore */
  }
}

export function clearAllDashboardSessionCaches(): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(`${DASHBOARD_SESSION_CACHE_KEY_PREFIX}:`)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  } catch {
    /* ignore */
  }
}