import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { LeagueStandings } from './admin'

export type GameweekStandingsMap = { [leagueId: string]: LeagueStandings[] }

/** Standings live in meta/standings; fall back to legacy embedded field. */
export async function getGameweekStandings(
  gameweekId: string
): Promise<GameweekStandingsMap | null> {
  const metaSnap = await getDoc(doc(db, 'gameweeks', gameweekId, 'meta', 'standings'))
  if (metaSnap.exists()) {
    const data = metaSnap.data().standings as GameweekStandingsMap | undefined
    return data ?? null
  }
  const gwSnap = await getDoc(doc(db, 'gameweeks', gameweekId))
  if (!gwSnap.exists()) return null
  return (gwSnap.data().standings as GameweekStandingsMap | undefined) ?? null
}