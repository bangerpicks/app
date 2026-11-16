/**
 * Pure season / standings math (unit-tested; mirrored in Cloud Functions).
 */

/**
 * Sum the best N weekly point totals (fewer weeks => sum what exists).
 * @param {number[]} weekScores
 * @param {number} bestN
 */
export function sumBestN(weekScores, bestN) {
  if (!Array.isArray(weekScores) || bestN <= 0) {
    return 0
  }
  const sorted = [...weekScores].sort((a, b) => b - a)
  return sorted.slice(0, bestN).reduce((sum, pts) => sum + pts, 0)
}

/**
 * Assign competition ranks with tied players sharing a rank (1,1,3,…).
 * @param {Array<Record<string, unknown>>} sortedEntries highest-first
 * @param {(entry: Record<string, unknown>) => number} getPoints
 */
export function assignTiedRanks(sortedEntries, getPoints) {
  let currentRank = 1
  let previousPoints = null
  let usersAtCurrentRank = 0

  for (const entry of sortedEntries) {
    const points = getPoints(entry)
    if (previousPoints === null) {
      currentRank = 1
      usersAtCurrentRank = 1
    } else if (points < previousPoints) {
      currentRank += usersAtCurrentRank
      usersAtCurrentRank = 1
    } else {
      usersAtCurrentRank += 1
    }
    entry.rank = currentRank
    previousPoints = points
  }
  return sortedEntries
}

/**
 * Season sort: seasonPoints desc, totalCorrect desc, joinMs asc (earlier account wins).
 */
export function compareSeasonStandingRows(a, b) {
  if (b.seasonPoints !== a.seasonPoints) {
    return b.seasonPoints - a.seasonPoints
  }
  if (b.totalCorrect !== a.totalCorrect) {
    return b.totalCorrect - a.totalCorrect
  }
  return a.joinMs - b.joinMs
}

/**
 * Pick which week scores count toward best-N (top scores by points).
 * @param {Array<{ gameweekId: string, points: number }>} weekRows
 * @param {number} bestN
 */
export function pickCountingWeekIds(weekRows, bestN) {
  return [...weekRows]
    .sort((a, b) => b.points - a.points)
    .slice(0, bestN)
    .map((row) => row.gameweekId)
}

/**
 * Whether a new flagship gameweek should join the active season list.
 * @param {{ gameweekIds?: string[], weekCount?: number }} season
 */
export function shouldAppendGameweekToSeason(season, gameweekId) {
  if (!season || !gameweekId) {
    return false
  }
  const ids = Array.isArray(season.gameweekIds) ? season.gameweekIds : []
  const weekCount = typeof season.weekCount === 'number' ? season.weekCount : 6
  if (ids.includes(gameweekId)) {
    return false
  }
  return ids.length < weekCount
}

/** Default Rankings tab for P4 (This Week first). */
export function defaultRankingsTab() {
  return 'this-week'
}