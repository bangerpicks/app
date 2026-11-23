'use client'

import { useMemo } from 'react'
import { useLiveMatches } from '@/lib/useLiveMatches'
import { useLanguage } from '@/lib/LanguageProvider'
import {
  pickNextMatchPreviews,
  summarizeFixtureSlate,
} from '@/lib/gameweek-match-preview.mjs'
import type { FixtureSlateSummary } from '@/lib/gameweek-display-phase'
import type { MatchCardData } from '@/types/dashboard'

export type GameweekFixturesState = {
  matches: MatchCardData[]
  previews: MatchCardData[]
  slate: FixtureSlateSummary
}

const EMPTY_SLATE: FixtureSlateSummary = {
  hasLive: false,
  allFinished: false,
  hasUpcoming: false,
  total: 0,
}

export function useGameweekFixtures(
  gameweekId: string,
  enabled = true,
  previewLimit = 3
): GameweekFixturesState {
  const { locale } = useLanguage()

  const matches = useLiveMatches(enabled ? gameweekId : null, [], locale)

  return useMemo(() => {
    const slate = summarizeFixtureSlate(matches) as FixtureSlateSummary
    return {
      matches,
      previews: pickNextMatchPreviews(matches, previewLimit),
      slate: matches.length ? slate : EMPTY_SLATE,
    }
  }, [matches, previewLimit])
}

export function fixturesStateFromMatches(
  matches: MatchCardData[],
  previewLimit = 3
): GameweekFixturesState {
  const slate = summarizeFixtureSlate(matches) as FixtureSlateSummary
  return {
    matches,
    previews: pickNextMatchPreviews(matches, previewLimit),
    slate: matches.length ? slate : EMPTY_SLATE,
  }
}