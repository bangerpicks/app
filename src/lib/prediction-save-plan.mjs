/**
 * Pure planning helpers for savePredictions (unit-tested; keep in sync with predictions.ts).
 */

/**
 * Fixtures that need entry writes: all picks on first join; only changed picks on follow-up.
 *
 * @param {{ creatingCache: boolean, existingPredictions: Record<string, string>, predictions: Map<number, string> }} params
 * @returns {number[]}
 */
export function fixturesNeedingWrite({ creatingCache, existingPredictions, predictions }) {
  const orderedFixtureIds = [...predictions.keys()].sort((a, b) => a - b)
  const fixtureIdsToWrite = []
  for (const fixtureId of orderedFixtureIds) {
    const pick = predictions.get(fixtureId)
    if (!pick) {
      continue
    }
    if (creatingCache || existingPredictions[String(fixtureId)] !== pick) {
      fixtureIdsToWrite.push(fixtureId)
    }
  }
  return fixtureIdsToWrite
}

/**
 * @param {number} fixtureCount number of fixtures that will be read in parallel
 * @returns {number} expected getDoc rounds (one Promise.all)
 */
export function predictionEntryReadRounds(fixtureCount) {
  return fixtureCount > 0 ? 1 : 0
}