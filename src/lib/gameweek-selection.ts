/**
 * Shared logic for picking the public "current" flagship gameweek and mapping OPEN/CLOSED.
 */

import { Timestamp } from 'firebase/firestore'
import { getAllGameweeks, AdminGameweekData } from './admin'
import type { GameweekData } from '@/types/dashboard'
import { GameweekStatus as DashboardGameweekStatus } from '@/types/dashboard'
import { isFlagshipGameweek } from './gameweek-constants'
import {
  DASHBOARD_LOAD_BUDGET_MS,
  LoadBudget,
} from './firestore-server-read'

export { isFlagshipGameweek, DEFAULT_LOCK_MINUTES_BEFORE_KICKOFF } from './gameweek-constants'
export type { GameweekType } from '@/types/admin'
export { LoadBudget, DASHBOARD_LOAD_BUDGET_MS }

/** Normalize Firestore Timestamp, serialized snapshot, or plain { seconds } shapes. */
export function coerceTimestamp(value: unknown): Timestamp | undefined {
  if (value == null) return undefined
  if (value instanceof Timestamp) return value
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Timestamp.fromDate(value)
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      const d = (value as { toDate: () => Date }).toDate()
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        return Timestamp.fromDate(d)
      }
    } catch {
      return undefined
    }
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as { seconds: number }).seconds
    if (typeof seconds === 'number') {
      const nanoseconds = (value as { nanoseconds?: number }).nanoseconds ?? 0
      return new Timestamp(seconds, nanoseconds)
    }
  }
  return undefined
}

export function getEffectiveDeadline(gw: AdminGameweekData): Timestamp | undefined {
  return coerceTimestamp(gw.lockAt) ?? coerceTimestamp(gw.deadline)
}

/** Whether the user can still submit picks (matches Firestore picksOpen / UI save gate). */
export function isGameweekPicksWindowOpen(gw: GameweekData): boolean {
  if (gw.status === 'UPCOMING' || gw.status === 'COMPLETED') return false
  if (gw.forceOpenForTesting === true) return true
  if (!gw.deadline) return false
  return Date.now() < gw.deadline.getTime()
}

/** Reconcile OPEN/CLOSED from deadline after session-cache deserialize. */
export function refreshPicksStatusFromDeadline(gw: GameweekData): GameweekData {
  if (gw.status === 'UPCOMING' || gw.status === 'COMPLETED') return gw
  const status: DashboardGameweekStatus = isGameweekPicksWindowOpen(gw)
    ? 'OPEN'
    : 'CLOSED'
  if (gw.status === status) return gw
  return { ...gw, status }
}

/**
 * Dashboard-style OPEN/CLOSED from pick lock (deadline / lockAt), not admin lifecycle status.
 */
export function mapGameweekDeadlineStatus(
  deadline: Timestamp | undefined,
  forceOpenForTesting?: boolean
): DashboardGameweekStatus {
  if (forceOpenForTesting === true) {
    return 'OPEN'
  }
  const lock = coerceTimestamp(deadline)
  if (!lock) {
    return 'CLOSED'
  }
  return new Date() < lock.toDate() ? 'OPEN' : 'CLOSED'
}

export function mapAdminGameweekToDashboardStatus(
  gw: AdminGameweekData
): DashboardGameweekStatus {
  if (gw.status === 'draft') {
    return 'UPCOMING'
  }
  if (gw.status === 'completed' || gw.status === 'archived') {
    return 'COMPLETED'
  }
  if (gw.status === 'active') {
    return mapGameweekDeadlineStatus(getEffectiveDeadline(gw), gw.forceOpenForTesting)
  }
  return 'UPCOMING'
}

/**
 * Pick the current flagship gameweek from pre-sorted lists (newest startDate first).
 * Archived weeks are never selected. Drafts are excluded from fallback.
 */
export function pickCurrentFlagshipGameweek(
  activeSorted: AdminGameweekData[],
  completedSorted: AdminGameweekData[],
  allSorted: AdminGameweekData[]
): AdminGameweekData | null {
  const activeFlagship = activeSorted.filter(isFlagshipGameweek)
  if (activeFlagship.length > 0) {
    return activeFlagship[0]
  }

  const completedFlagship = completedSorted.filter(isFlagshipGameweek)
  if (completedFlagship.length > 0) {
    return completedFlagship[0]
  }

  const fallback = allSorted.find(
    (gw) =>
      gw.status !== 'archived' &&
      gw.status !== 'draft' &&
      isFlagshipGameweek(gw)
  )
  return fallback ?? null
}

const serverReadOpts = (
  budget: LoadBudget,
  servedFromCacheRef?: { current: boolean }
) =>
  ({
    serverPreferring: true,
    budget,
    servedFromCacheRef,
  }) as const

/**
 * Resolve the same "current" gameweek for dashboard and rankings.
 * Server-first reads with a shared time budget (dashboard path).
 */
export async function fetchCurrentGameweek(
  budget?: LoadBudget,
  servedFromCacheRef?: { current: boolean }
): Promise<AdminGameweekData | null> {
  const loadBudget = budget ?? new LoadBudget()
  const readOpts = serverReadOpts(loadBudget, servedFromCacheRef)

  try {
    const activeGameweeks = await getAllGameweeks(
      {
        status: 'active',
        sortBy: 'date',
        sortOrder: 'desc',
      },
      readOpts
    )
    const activeFlagship = pickCurrentFlagshipGameweek(activeGameweeks, [], [])
    if (activeFlagship) {
      return activeFlagship
    }

    const completedGameweeks = await getAllGameweeks(
      {
        status: 'completed',
        sortBy: 'date',
        sortOrder: 'desc',
      },
      readOpts
    )
    const completedFlagship = pickCurrentFlagshipGameweek([], completedGameweeks, [])
    if (completedFlagship) {
      return completedFlagship
    }

    const allGameweeks = await getAllGameweeks(
      { sortBy: 'date', sortOrder: 'desc' },
      readOpts
    )
    return pickCurrentFlagshipGameweek(activeGameweeks, completedGameweeks, allGameweeks)
  } catch (error) {
    console.error('Error fetching current gameweek:', error)
    throw error
  }
}

export function resolvePlayerCountFromGameweek(gw: AdminGameweekData): number | undefined {
  if (typeof gw.playerCount === 'number') {
    return gw.playerCount
  }
  return undefined
}