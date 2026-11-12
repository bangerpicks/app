/**
 * Chunk sizes for savePredictions write batches (Firestore production limit).
 * @see src/lib/predictions.ts
 */

/** Max fixtures per batch when the first batch also creates cache + gameweek playerCount. */
export const JOIN_BATCH_MAX_FIXTURES = 3

/** Max fixtures per follow-up batch (cache update only, no gameweek join). */
export const FOLLOW_UP_BATCH_MAX_FIXTURES = 3

/**
 * @param {number[]} fixtureIds - fixtures to write, in save order
 * @param {number} firstNewFixtureId
 * @returns {number[]}
 */
function buildJoinFirstChunk(fixtureIds, firstNewFixtureId) {
  const joinIndex = fixtureIds.indexOf(firstNewFixtureId)
  if (joinIndex === -1) {
    return fixtureIds.slice(0, JOIN_BATCH_MAX_FIXTURES)
  }
  const chunk = []
  for (let i = joinIndex; i < fixtureIds.length && chunk.length < JOIN_BATCH_MAX_FIXTURES; i++) {
    chunk.push(fixtureIds[i])
  }
  for (let i = joinIndex - 1; i >= 0 && chunk.length < JOIN_BATCH_MAX_FIXTURES; i--) {
    chunk.unshift(fixtureIds[i])
  }
  return chunk
}

/**
 * Split fixture ids into sequential writeBatch chunks.
 *
 * @param {number[]} fixtureIds - fixtures to write, in save order
 * @param {{ includesGameweekJoinExtras: boolean, firstNewFixtureId?: number | null }} opts
 *   When includesGameweekJoinExtras is true, the first batch creates gameweek_predictions and
 *   increments playerCount; it must include firstNewFixtureId when set.
 * @returns {number[][]}
 */
export function chunkPredictionFixtures(fixtureIds, opts) {
  const { includesGameweekJoinExtras, firstNewFixtureId = null } = opts
  if (fixtureIds.length === 0) {
    return []
  }

  const chunks = []
  let remaining = [...fixtureIds]

  if (includesGameweekJoinExtras && firstNewFixtureId != null) {
    const firstChunk = buildJoinFirstChunk(fixtureIds, firstNewFixtureId)
    const firstSet = new Set(firstChunk)
    remaining = fixtureIds.filter((id) => !firstSet.has(id))
    chunks.push(firstChunk)
  } else {
    const firstSize = includesGameweekJoinExtras
      ? JOIN_BATCH_MAX_FIXTURES
      : FOLLOW_UP_BATCH_MAX_FIXTURES
    chunks.push(remaining.slice(0, firstSize))
    remaining = remaining.slice(firstSize)
  }

  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, FOLLOW_UP_BATCH_MAX_FIXTURES))
    remaining = remaining.slice(FOLLOW_UP_BATCH_MAX_FIXTURES)
  }
  return chunks
}
