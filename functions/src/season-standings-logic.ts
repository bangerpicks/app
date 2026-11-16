/** Pure season / standings math (keep in sync with src/lib/season-standings.mjs). */

export function sumBestN(weekScores: number[], bestN: number): number {
  if (!Array.isArray(weekScores) || bestN <= 0) {
    return 0
  }
  const sorted = [...weekScores].sort((a, b) => b - a)
  return sorted.slice(0, bestN).reduce((sum, pts) => sum + pts, 0)
}

export interface SeasonSortRow {
  seasonPoints: number
  totalCorrect: number
  joinMs: number
}

export function compareSeasonStandingRows(a: SeasonSortRow, b: SeasonSortRow): number {
  if (b.seasonPoints !== a.seasonPoints) {
    return b.seasonPoints - a.seasonPoints
  }
  if (b.totalCorrect !== a.totalCorrect) {
    return b.totalCorrect - a.totalCorrect
  }
  return a.joinMs - b.joinMs
}

export function assignTiedRanks<T extends { rank?: number }>(
  sortedEntries: T[],
  getPoints: (entry: T) => number
): T[] {
  let currentRank = 1
  let previousPoints: number | null = null
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

export function pickCountingWeekIds(
  weekRows: Array<{ gameweekId: string; points: number }>,
  bestN: number
): string[] {
  return [...weekRows]
    .sort((a, b) => b.points - a.points)
    .slice(0, bestN)
    .map((row) => row.gameweekId)
}

export function shouldAppendGameweekToSeason(
  season: { gameweekIds?: string[]; weekCount?: number } | null | undefined,
  gameweekId: string
): boolean {
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