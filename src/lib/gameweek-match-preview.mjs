/** @typedef {import('@/types/dashboard').MatchCardData} MatchCardData */

const IN_PLAY = new Set(['LIVE', 'HT', '1H', '2H', 'ET', 'P'])
const FINISHED = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO', 'CANC', 'ABD'])

/**
 * @param {string | undefined} status
 */
export function isMatchInPlay(status) {
  return status != null && IN_PLAY.has(status)
}

/**
 * @param {string | undefined} status
 */
export function isMatchNotStarted(status) {
  return !status || status === 'TBP' || status === 'NS' || status === 'TBD'
}

/**
 * @param {string | undefined} status
 */
export function isMatchFinished(status) {
  return status != null && FINISHED.has(status)
}

/**
 * Pick up to `limit` fixtures to preview: in-play first, then next kickoffs, then recent results.
 * @param {MatchCardData[]} matches
 * @param {number} [limit]
 * @returns {MatchCardData[]}
 */
export function pickNextMatchPreviews(matches, limit = 3) {
  if (!matches?.length) return []

  const sorted = [...matches].sort((a, b) => {
    const ta = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime()
    const tb = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime()
    return ta - tb
  })

  const inPlay = sorted.filter((m) => isMatchInPlay(m.matchStatus))
  const upcoming = sorted.filter(
    (m) => !isMatchInPlay(m.matchStatus) && !isMatchFinished(m.matchStatus)
  )
  const finished = sorted.filter((m) => isMatchFinished(m.matchStatus))

  /** @type {MatchCardData[]} */
  const result = []
  const seen = new Set()

  const add = (/** @type {MatchCardData} */ m) => {
    if (result.length >= limit || seen.has(m.fixtureId)) return
    seen.add(m.fixtureId)
    result.push(m)
  }

  for (const m of inPlay) add(m)
  for (const m of upcoming) add(m)
  for (let i = finished.length - 1; i >= 0 && result.length < limit; i--) {
    add(finished[i])
  }

  return result.slice(0, limit)
}

/**
 * Preview tiles for dashboard cards: user's picked fixtures (kickoff order), up to `limit`.
 * Falls back to {@link pickNextMatchPreviews} when the user has no saved picks.
 *
 * @param {MatchCardData[]} matches
 * @param {Map<number, 'H' | 'D' | 'A'> | ReadonlyMap<number, 'H' | 'D' | 'A'>} picks
 * @param {number} [limit]
 * @returns {MatchCardData[]}
 */
export function pickGameweekCardPreviews(matches, picks, limit = 3) {
  if (!matches?.length) return []
  if (!picks?.size) return pickNextMatchPreviews(matches, limit)

  const sorted = [...matches].sort((a, b) => {
    const ta = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime()
    const tb = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime()
    return ta - tb
  })

  const picked = sorted.filter((m) => picks.has(m.fixtureId))
  return picked.slice(0, limit)
}

/**
 * @param {MatchCardData[]} matches
 * @returns {{ hasLive: boolean, allFinished: boolean, hasUpcoming: boolean, total: number }}
 */
export function summarizeFixtureSlate(matches) {
  if (!matches?.length) {
    return { hasLive: false, allFinished: false, hasUpcoming: false, total: 0 }
  }

  let hasLive = false
  let allFinished = true
  let hasUpcoming = false

  for (const m of matches) {
    const status = m.matchStatus
    if (isMatchInPlay(status)) {
      hasLive = true
      allFinished = false
    } else if (isMatchFinished(status)) {
      // keep allFinished true only if every match finishes
    } else {
      allFinished = false
      hasUpcoming = true
    }
  }

  return {
    hasLive,
    allFinished: allFinished && matches.length > 0,
    hasUpcoming,
    total: matches.length,
  }
}

/**
 * @param {number} home
 * @param {number} away
 * @returns {'H' | 'D' | 'A' | null}
 */
export function matchWinnerFromScore(home, away) {
  if (home == null || away == null) return null
  if (home > away) return 'H'
  if (home < away) return 'A'
  return 'D'
}

/**
 * @param {MatchCardData} match
 * @param {'H' | 'D' | 'A' | null | undefined} prediction
 * @returns {boolean | null}
 */
export function pickCorrectnessForMatch(match, prediction) {
  if (!prediction || !isMatchFinished(match.matchStatus)) return null
  const home = match.score?.home
  const away = match.score?.away
  if (home == null || away == null) return null
  const winner = matchWinnerFromScore(home, away)
  return winner === prediction
}