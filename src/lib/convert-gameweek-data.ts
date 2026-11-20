import type { AdminGameweekData } from '@/lib/admin'
import type { GameweekData } from '@/types/dashboard'
import {
  getEffectiveDeadline,
  mapAdminGameweekToDashboardStatus,
  resolvePlayerCountFromGameweek,
} from '@/lib/gameweek-selection'

/** Map Firestore admin gameweek → dashboard/picks card shape. */
export function convertAdminGameweekToGameweekData(
  adminGameweek: AdminGameweekData
): GameweekData {
  const lock = getEffectiveDeadline(adminGameweek)
  return {
    gameweekId: adminGameweek.gameweekId,
    name: adminGameweek.name,
    playerCount: resolvePlayerCountFromGameweek(adminGameweek) ?? 0,
    status: mapAdminGameweekToDashboardStatus(adminGameweek),
    deadline: lock?.toDate(),
    startDate: adminGameweek.startDate?.toDate(),
    endDate: adminGameweek.endDate?.toDate(),
    forceOpenForTesting: adminGameweek.forceOpenForTesting,
    type: adminGameweek.type,
    description: adminGameweek.description,
    weekNumber: adminGameweek.weekNumber,
  }
}