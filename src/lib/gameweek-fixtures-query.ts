'use client'

import { useQuery } from '@tanstack/react-query'
import { getGameweekFixtures, type DashboardFirestoreReadOptions } from './admin'
import type { GameweekFixtureData } from './admin'

export function gameweekFixturesQueryKey(gameweekId: string) {
  return ['gameweek-fixtures', gameweekId] as const
}

export function useGameweekFixturesQuery(
  gameweekId: string | null,
  opts?: DashboardFirestoreReadOptions
) {
  return useQuery({
    queryKey: gameweekId ? gameweekFixturesQueryKey(gameweekId) : ['gameweek-fixtures', 'none'],
    enabled: Boolean(gameweekId),
    queryFn: async (): Promise<GameweekFixtureData[]> => {
      if (!gameweekId) return []
      return getGameweekFixtures(gameweekId, opts)
    },
    staleTime: 60_000,
  })
}