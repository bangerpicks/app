'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveMatches } from '@/lib/useLiveMatches'
import { useLanguage } from '@/lib/LanguageProvider'
import { useAuth } from '@/lib/AuthProvider'
import { getUserPredictionsForGameweek } from '@/lib/predictions'
import {
  pickGameweekCardPreviews,
  pickNextMatchPreviews,
  summarizeFixtureSlate,
} from '@/lib/gameweek-match-preview.mjs'
import type { FixtureSlateSummary } from '@/lib/gameweek-display-phase'
import type { MatchCardData, Prediction } from '@/types/dashboard'

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

function mergePredictionsOntoMatches(
  matches: MatchCardData[],
  predictions: Map<number, Prediction>
): MatchCardData[] {
  if (predictions.size === 0) return matches
  return matches.map((m) => ({
    ...m,
    userPrediction: predictions.get(m.fixtureId) ?? m.userPrediction ?? null,
  }))
}

function predictionsKey(matches: MatchCardData[], predictions: Map<number, Prediction>): string {
  return matches
    .map((m) => `${m.fixtureId}:${predictions.get(m.fixtureId) ?? m.userPrediction ?? ''}`)
    .join('|')
}

function useGameweekPredictionMap(
  gameweekId: string,
  matches: MatchCardData[],
  enabled: boolean
): Map<number, Prediction> {
  const { user } = useAuth()
  const [predictions, setPredictions] = useState<Map<number, Prediction>>(new Map())
  const fixtureSig = useMemo(
    () => matches.map((m) => m.fixtureId).join(','),
    [matches]
  )

  useEffect(() => {
    if (!enabled || !gameweekId || !user?.uid || matches.length === 0) {
      setPredictions(new Map())
      return
    }

    let cancelled = false
    const fixtureIds = matches.map((m) => m.fixtureId)

    void getUserPredictionsForGameweek(user.uid, gameweekId, fixtureIds).then(({ predictions: map }) => {
      if (!cancelled) setPredictions(map)
    })

    return () => {
      cancelled = true
    }
  }, [enabled, gameweekId, user?.uid, fixtureSig, matches])

  return predictions
}

export function useGameweekFixtures(
  gameweekId: string,
  enabled = true,
  previewLimit = 3
): GameweekFixturesState {
  const { locale } = useLanguage()
  const { user } = useAuth()
  const [predictionSeed, setPredictionSeed] = useState<MatchCardData[]>([])
  const lastSeedKeyRef = useRef('')

  const rawMatches = useLiveMatches(enabled ? gameweekId : null, predictionSeed, locale)
  const livePredictions = useGameweekPredictionMap(
    gameweekId,
    rawMatches,
    enabled && Boolean(user)
  )

  useEffect(() => {
    if (!enabled || rawMatches.length === 0) {
      if (lastSeedKeyRef.current !== '') {
        lastSeedKeyRef.current = ''
        setPredictionSeed([])
      }
      return
    }
    const merged = mergePredictionsOntoMatches(rawMatches, livePredictions)
    const seedKey = predictionsKey(merged, livePredictions)
    if (seedKey === lastSeedKeyRef.current) return
    lastSeedKeyRef.current = seedKey
    setPredictionSeed(merged)
  }, [enabled, rawMatches, livePredictions])

  return useMemo(() => {
    const matches = mergePredictionsOntoMatches(rawMatches, livePredictions)
    const slate = summarizeFixtureSlate(matches) as FixtureSlateSummary
    const previews =
      livePredictions.size > 0
        ? pickGameweekCardPreviews(matches, livePredictions, previewLimit)
        : pickNextMatchPreviews(matches, previewLimit)
    return {
      matches,
      previews,
      slate: matches.length ? slate : EMPTY_SLATE,
    }
  }, [rawMatches, livePredictions, previewLimit])
}

export function fixturesStateFromMatches(
  matches: MatchCardData[],
  previewLimit = 3
): GameweekFixturesState {
  const slate = summarizeFixtureSlate(matches) as FixtureSlateSummary
  const picks = new Map<number, Prediction>()
  for (const m of matches) {
    if (m.userPrediction) picks.set(m.fixtureId, m.userPrediction)
  }
  const previews =
    picks.size > 0
      ? pickGameweekCardPreviews(matches, picks, previewLimit)
      : pickNextMatchPreviews(matches, previewLimit)
  return {
    matches,
    previews,
    slate: matches.length ? slate : EMPTY_SLATE,
  }
}