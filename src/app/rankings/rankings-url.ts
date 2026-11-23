import {
  COMPETITION_TRACK_ORDER,
  type CompetitionTrackId,
} from '@/lib/competition-tracks'

export const PAST_GAMEWEEKS_LIMIT = 10

export function parseTrackParam(value: string | null): CompetitionTrackId | null {
  if (!value) return null
  return COMPETITION_TRACK_ORDER.includes(value as CompetitionTrackId)
    ? (value as CompetitionTrackId)
    : null
}