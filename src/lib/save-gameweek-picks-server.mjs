/**
 * Pure helpers shared by saveGameweekPicks (functions) and unit tests.
 */

/**
 * @param {{ creatingCache: boolean, existingPredictions: Record<string, string>, predictions: Map<number, string> }} params
 * @returns {number[]}
 */
export function fixturesNeedingWriteServer({ creatingCache, existingPredictions, predictions }) {
  const ordered = [...predictions.keys()].sort((a, b) => a - b)
  const out = []
  for (const fixtureId of ordered) {
    const pick = predictions.get(fixtureId)
    if (!pick) continue
    if (creatingCache || existingPredictions[String(fixtureId)] !== pick) {
      out.push(fixtureId)
    }
  }
  return out
}

/**
 * @param {number[]} fixtureIdsToWrite
 * @param {(fixtureId: number) => boolean} entryExists
 * @returns {number | null}
 */
export function firstNewEntryFixtureId(fixtureIdsToWrite, entryExists) {
  for (const fixtureId of fixtureIdsToWrite) {
    if (!entryExists(fixtureId)) return fixtureId
  }
  return null
}