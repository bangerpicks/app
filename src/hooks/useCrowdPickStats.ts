'use client'

import { useEffect, useState } from 'react'
import {
  crowdStatsToPercents,
  getCrowdPickStatsForFixtures,
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
  const [playerCountByFixture, setPlayerCountByFixture] = useState<
    Map<number, number>
  >(new Map())

  const fixtureKey = fixtureIds.join(',')

  useEffect(() => {
    if (!enabled || fixtureIds.length === 0) {
      setCrowdPercentsByFixture(new Map())
      setPlayerCountByFixture(new Map())
      return
    }

    let cancelled = false

    getCrowdPickStatsForFixtures(fixtureIds)
      .then((statsMap) => {
        if (cancelled) return
        const percents = new Map<number, GafferWinProbabilities>()
        const totals = new Map<number, number>()
        statsMap.forEach((stats, fixtureId) => {
          totals.set(fixtureId, stats.total)
          const pct = crowdStatsToPercents(stats)
          if (pct) percents.set(fixtureId, pct)
        })
        setCrowdPercentsByFixture(percents)
        setPlayerCountByFixture(totals)
      })
      .catch((error) => {
        console.error('Error loading crowd pick stats:', error)
        if (!cancelled) {
          setCrowdPercentsByFixture(new Map())
          setPlayerCountByFixture(new Map())
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled, fixtureKey, refreshToken])

  return { crowdPercentsByFixture, playerCountByFixture }
}
