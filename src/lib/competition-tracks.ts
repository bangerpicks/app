import type { AdminGameweekData } from '@/lib/admin'
import type { PastGameweekOption } from '@/types/dashboard'
import {
  COMPETITION_TRACK_ORDER,
  filterGameweeksForTrack,
  isFlagshipTrack,
  listAvailableTracks,
  listPastGameweeksForTrack,
  pickCurrentGameweekForTrack,
  pickDefaultTrack,
  trackIdForGameweek,
} from '@/lib/competition-tracks.mjs'

export type CompetitionTrackId = (typeof COMPETITION_TRACK_ORDER)[number]

export {
  COMPETITION_TRACK_ORDER,
  filterGameweeksForTrack,
  isFlagshipTrack,
  listAvailableTracks,
  listPastGameweeksForTrack,
  pickCurrentGameweekForTrack,
  pickDefaultTrack,
  trackIdForGameweek,
}

export function buildNavigableWeeksForTrack(
  filtered: AdminGameweekData[],
  currentGameweek: AdminGameweekData | null,
  thisWeekLabel: string
): PastGameweekOption[] {
  if (!currentGameweek) {
    return listPastGameweeksForTrack(filtered, null)
  }
  const past = listPastGameweeksForTrack(filtered, currentGameweek.gameweekId)
  return [
    { gameweekId: currentGameweek.gameweekId, name: currentGameweek.name },
    ...past.filter((p) => p.gameweekId !== currentGameweek.gameweekId),
  ]
}