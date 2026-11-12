'use client'

import { useEffect, useState } from 'react'
import {
  crowdStatsToPercents,
  getCrowdPickStatsForFixtures,
  type CrowdPickStats,
} from '@/lib/crowd-picks'
import type { GafferWinProbabilities } from '@/lib/match-card-display'

export function useCrowdPickStats(
  fixtureIds: number[],
  enabled: boolean,
  refreshToken = 0
) {
  const [crowdPercentsByFixture, setCrowdPercentsByFixture] = useState<
    Map<number, GafferWinProbabilities>
  >(new Map())
  const [crowdStatsByFixture, setCrowdStatsByFixture] = useState<
    Map<number, CrowdPickStats>
  >(new Map())
  const [playerCountByFixture, setPlayerCountByFixture] = useState<
    Map<number, number>
  >(new Map())

  const fixtureKey = fixtureIds.join(',')

  useEffect(() => {
    if (!enabled || fixtureIds.length === 0) {
      setCrowdPercentsByFixture(new Map())
      setCrowdStatsByFixture(new Map())
      setPlayerCountByFixture(new Map())
      return
    }

    let cancelled = false

    getCrowdPickStatsForFixtures(fixtureIds)
      .then((statsMap) => {
        if (cancelled) return
        const percents = new Map<number, GafferWinProbabilities>()
        const totals = new Map<number, number>()
        const statsByFixture = new Map<number, CrowdPickStats>()
        statsMap.forEach((stats, fixtureId) => {
          totals.set(fixtureId, stats.total)
          if (stats.total > 0) {
            statsByFixture.set(fixtureId, stats)
          }
          const pct = crowdStatsToPercents(stats)
          if (pct) percents.set(fixtureId, pct)
        })
        setCrowdPercentsByFixture(percents)
        setCrowdStatsByFixture(statsByFixture)
        setPlayerCountByFixture(totals)
      })
      .catch((error) => {
        console.error('Error loading crowd pick stats:', error)
        if (!cancelled) {
          setCrowdPercentsByFixture(new Map())
          setCrowdStatsByFixture(new Map())
          setPlayerCountByFixture(new Map())
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled, fixtureKey, refreshToken])

  return { crowdPercentsByFixture, crowdStatsByFixture, playerCountByFixture }
}
