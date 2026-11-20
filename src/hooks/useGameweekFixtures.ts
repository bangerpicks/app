'use client'

import { useEffect, useMemo, useState } from 'react'
import { getGameweekFixtures } from '@/lib/admin'
import { useLiveMatches } from '@/lib/useLiveMatches'
import { useLanguage } from '@/lib/LanguageProvider'
import { convertGameweekFixtureToMatchCard } from '@/lib/convert-gameweek-fixture'
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
  const [initialMatches, setInitialMatches] = useState<MatchCardData[]>([])

  useEffect(() => {
    if (!enabled || !gameweekId) {
      setInitialMatches([])
      return
    }

    let cancelled = false
    getGameweekFixtures(gameweekId)
      .then((fixtures) => {
        if (cancelled) return
        setInitialMatches(
          fixtures.map((f) => convertGameweekFixtureToMatchCard(f, locale))
        )
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Gameweek fixtures load failed:', err)
          setInitialMatches([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [gameweekId, enabled, locale])

  const matches = useLiveMatches(enabled ? gameweekId : null, initialMatches, locale)

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