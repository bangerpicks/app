/**
 * Shared logic for picking the public "current" flagship gameweek and mapping OPEN/CLOSED.
 */

import { Timestamp } from 'firebase/firestore'
import { getAllGameweeks, AdminGameweekData } from './admin'
import { GameweekStatus as DashboardGameweekStatus } from '@/types/dashboard'
import { isFlagshipGameweek } from './gameweek-constants'

export { isFlagshipGameweek, DEFAULT_LOCK_MINUTES_BEFORE_KICKOFF } from './gameweek-constants'
export type { GameweekType } from '@/types/admin'

export function getEffectiveDeadline(gw: AdminGameweekData): Timestamp | undefined {
  return gw.lockAt ?? gw.deadline
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
  if (!deadline) {
    return 'CLOSED'
  }
  return new Date() < deadline.toDate() ? 'OPEN' : 'CLOSED'
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

/**
 * Resolve the same "current" gameweek for dashboard and rankings.
 */
export async function fetchCurrentGameweek(): Promise<AdminGameweekData | null> {
  try {
    const [activeGameweeks, completedGameweeks, allGameweeks] = await Promise.all([
      getAllGameweeks({ status: 'active', sortBy: 'date', sortOrder: 'desc' }),
      getAllGameweeks({ status: 'completed', sortBy: 'date', sortOrder: 'desc' }),
      getAllGameweeks({ sortBy: 'date', sortOrder: 'desc' }),
    ])

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
