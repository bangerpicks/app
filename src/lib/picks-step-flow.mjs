/**
 * Step-flow helpers for the picks page (keep in sync with picks-step-flow.ts).
 */

/**
 * @param {readonly { fixtureId: number }[]} matches
 * @param {(fixtureId: number) => 'H' | 'D' | 'A' | null | undefined} getPrediction
 * @returns {number | null}
 */
export function resolveInitialFixtureId(matches, getPrediction) {
  if (!matches.length) return null
  for (const match of matches) {
    if (!getPrediction(match.fixtureId)) {
      return match.fixtureId
    }
  }
  return matches[0].fixtureId
}

/**
 * Next fixture to focus after a pick: first unpicked after current (wrap), or same if all picked.
 *
 * @param {readonly { fixtureId: number }[]} matches
 * @param {(fixtureId: number) => 'H' | 'D' | 'A' | null | undefined} getPrediction
 * @param {number} currentId
 * @returns {number | null}
 */
export function resolveNextFixtureId(matches, getPrediction, currentId) {
  if (!matches.length) return null
  const ids = matches.map((m) => m.fixtureId)
  const startIdx = ids.indexOf(currentId)
  if (startIdx === -1) {
    return resolveInitialFixtureId(matches, getPrediction)
  }

  for (let offset = 1; offset <= ids.length; offset += 1) {
    const idx = (startIdx + offset) % ids.length
    const fixtureId = ids[idx]
    if (!getPrediction(fixtureId)) {
      return fixtureId
    }
  }

  return currentId
}

/**
 * @param {readonly { fixtureId: number }[]} matches
 * @param {number} activeFixtureId
 * @returns {number}
 */
export function resolveActiveStepIndex(matches, activeFixtureId) {
  const idx = matches.findIndex((m) => m.fixtureId === activeFixtureId)
  return idx >= 0 ? idx + 1 : 1
}