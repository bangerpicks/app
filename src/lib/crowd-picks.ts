import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import type { GafferWinProbabilities } from './match-card-display'
import type { Prediction } from '@/types/dashboard'
import { withTimeout } from './firestore-utils'

export interface CrowdPickStats {
  home: number
  draw: number
  away: number
  total: number
}

const EMPTY_STATS: CrowdPickStats = { home: 0, draw: 0, away: 0, total: 0 }

export function crowdStatsToPercents(
  stats: CrowdPickStats
): GafferWinProbabilities | null {
  if (stats.total === 0) return null
  let home = Math.round((stats.home / stats.total) * 100)
  let draw = Math.round((stats.draw / stats.total) * 100)
  let away = Math.round((stats.away / stats.total) * 100)
  const drift = 100 - (home + draw + away)
  if (drift !== 0) {
    away += drift
  }
  return { home, draw, away }
}

export async function getCrowdPickStatsForFixture(
  fixtureId: number
): Promise<CrowdPickStats> {
  const parentRef = doc(db, 'predictions', String(fixtureId))
  const parentSnap = await getDoc(parentRef)
  const cached = parentSnap.data()?.crowdPickCounts as
    | { H?: number; D?: number; A?: number; total?: number }
    | undefined
  if (cached && typeof cached.total === 'number') {
    return {
      home: cached.H ?? 0,
      draw: cached.D ?? 0,
      away: cached.A ?? 0,
      total: cached.total,
    }
  }

  const entriesRef = collection(db, 'predictions', String(fixtureId), 'entries')
  const snapshot = await withTimeout(
    getDocs(entriesRef),
    15000,
    'Failed to load crowd picks - request timed out'
  )

  const stats = { ...EMPTY_STATS }
  snapshot.forEach((entryDoc) => {
    const pick = entryDoc.data().pick as Prediction | undefined
    if (pick === 'H') stats.home += 1
    else if (pick === 'D') stats.draw += 1
    else if (pick === 'A') stats.away += 1
    if (pick === 'H' || pick === 'D' || pick === 'A') stats.total += 1
  })
  return stats
}

export async function getCrowdPickStatsForFixtures(
  fixtureIds: number[]
): Promise<Map<number, CrowdPickStats>> {
  const pairs = await Promise.all(
    fixtureIds.map(async (fixtureId) => {
      try {
        const stats = await getCrowdPickStatsForFixture(fixtureId)
        return [fixtureId, stats] as const
      } catch (error) {
        console.warn(`Crowd picks unavailable for fixture ${fixtureId}:`, error)
        return [fixtureId, { ...EMPTY_STATS }] as const
      }
    })
  )
  return new Map(pairs)
}
