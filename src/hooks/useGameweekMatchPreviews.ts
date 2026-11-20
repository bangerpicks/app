'use client'

import { useGameweekFixtures } from '@/hooks/useGameweekFixtures'
import type { MatchCardData } from '@/types/dashboard'

/** @deprecated Prefer useGameweekFixtures for slate + previews */
export function useGameweekMatchPreviews(
  gameweekId: string,
  enabled = true,
  limit = 3
): MatchCardData[] {
  const { previews } = useGameweekFixtures(gameweekId, enabled, limit)
  return previews
}