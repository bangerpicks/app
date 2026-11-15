/**
 * Session cache for dashboard gameweek + fixtures so slow networks can show the last good load.
 */

import { GameweekData, MatchCardData } from '@/types/dashboard'

const CACHE_KEY = 'banger-picks-dashboard-cache'
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
  return {
    ...raw,
    deadline: raw.deadline ? new Date(raw.deadline) : undefined,
    startDate: raw.startDate ? new Date(raw.startDate) : undefined,
    endDate: raw.endDate ? new Date(raw.endDate) : undefined,
  }
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

export function readDashboardSessionCache(): DashboardSessionCache | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      version: number
      savedAt: number
      gameweekId: string
      gameweek: SerializedGameweekData
      matches: SerializedMatchCardData[]
    }
    if (parsed.version !== CACHE_VERSION) return null
    return {
      version: CACHE_VERSION,
      savedAt: parsed.savedAt,
      gameweekId: parsed.gameweekId,
      gameweek: deserializeGameweek(parsed.gameweek),
      matches: parsed.matches.map(deserializeMatch),
    }
  } catch {
    return null
  }
}

export function writeDashboardSessionCache(payload: Omit<DashboardSessionCache, 'version' | 'savedAt'>): void {
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
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(body))
  } catch {
    // Quota or private mode — ignore
  }
}

export function clearDashboardSessionCache(): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    sessionStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}