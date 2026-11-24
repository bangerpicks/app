import type { MatchCardData, Prediction } from '@/types/dashboard'
import {
  resolveActiveStepIndex as resolveActiveStepIndexMjs,
  resolveInitialFixtureId as resolveInitialFixtureIdMjs,
  resolveNextFixtureId as resolveNextFixtureIdMjs,
} from '@/lib/picks-step-flow.mjs'

export type GetPredictionFn = (fixtureId: number) => Prediction | null | undefined

export function resolveInitialFixtureId(
  matches: readonly MatchCardData[],
  getPrediction: GetPredictionFn
): number | null {
  return resolveInitialFixtureIdMjs(matches, getPrediction)
}

export function resolveNextFixtureId(
  matches: readonly MatchCardData[],
  getPrediction: GetPredictionFn,
  currentId: number
): number | null {
  return resolveNextFixtureIdMjs(matches, getPrediction, currentId)
}

export function resolveActiveStepIndex(
  matches: readonly MatchCardData[],
  activeFixtureId: number
): number {
  return resolveActiveStepIndexMjs(matches, activeFixtureId)
}