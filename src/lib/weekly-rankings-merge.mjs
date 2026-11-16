/**
 * Merge live weekly rankings (picks + avatars from predictions) with
 * precomputed weeklyStandings (rank + points after scoring).
 */

/**
 * @param {Array<{ userId: string; rank?: number; points?: number; weeklyPoints?: number; displayName?: string; photoURL?: string | null; isCurrentUser?: boolean }> | null | undefined} standingsRows
 * @param {Array<{ userId: string; rank?: number; points?: number; weeklyPoints?: number; displayName?: string; photoURL?: string | null; matchPredictions?: unknown[]; isCurrentUser?: boolean; lastWeekPlace?: number | null; lastCompletedGameweekId?: string | null; allTimeScore?: number; accuracy?: number; totalPredictions?: number; correctPredictions?: number }> | null | undefined} liveRows
 * @returns {Array<Record<string, unknown>>}
 */
export function mergeWeeklyRankingsWithStandings(standingsRows, liveRows) {
  /** @type {Map<string, object>} */
  const standingsByUid = new Map()
  if (Array.isArray(standingsRows)) {
    for (const row of standingsRows) {
      if (row?.userId) standingsByUid.set(row.userId, row)
    }
  }

  /** @type {Map<string, object>} */
  const liveByUid = new Map()
  if (Array.isArray(liveRows)) {
    for (const row of liveRows) {
      if (row?.userId) liveByUid.set(row.userId, row)
    }
  }

  const allUids = new Set([...liveByUid.keys(), ...standingsByUid.keys()])
  if (allUids.size === 0) {
    return []
  }

  const hasStandings = standingsByUid.size > 0
  /** @type {Array<Record<string, unknown>>} */
  const merged = []

  for (const uid of allUids) {
    const live = liveByUid.get(uid)
    const standing = standingsByUid.get(uid)

    if (live) {
      const standingPhoto =
        standing?.photoURL != null && standing.photoURL !== ''
          ? standing.photoURL
          : null
      const photoURL =
        live.photoURL != null && live.photoURL !== ''
          ? live.photoURL
          : standingPhoto

      merged.push({
        ...live,
        photoURL,
        displayName: live.displayName || standing?.displayName || 'Player',
        ...(standing
          ? {
              rank: standing.rank ?? live.rank,
              weeklyPoints: standing.weeklyPoints ?? standing.points ?? live.weeklyPoints,
              points: standing.points ?? live.points,
            }
          : {}),
      })
    } else if (standing) {
      merged.push({
        userId: standing.userId,
        displayName: standing.displayName || 'Player',
        photoURL: standing.photoURL ?? null,
        points: standing.points ?? 0,
        weeklyPoints: standing.weeklyPoints ?? standing.points ?? 0,
        rank: standing.rank ?? 0,
        isCurrentUser: standing.isCurrentUser ?? false,
        matchPredictions: [],
      })
    }
  }

  if (hasStandings) {
    merged.sort((a, b) => {
      const rankA = typeof a.rank === 'number' ? a.rank : Number.MAX_SAFE_INTEGER
      const rankB = typeof b.rank === 'number' ? b.rank : Number.MAX_SAFE_INTEGER
      if (rankA !== rankB) return rankA - rankB
      const nameA = String(a.displayName || '')
      const nameB = String(b.displayName || '')
      return nameA.localeCompare(nameB)
    })
  } else {
    merged.sort((a, b) => {
      const rankA = typeof a.rank === 'number' ? a.rank : Number.MAX_SAFE_INTEGER
      const rankB = typeof b.rank === 'number' ? b.rank : Number.MAX_SAFE_INTEGER
      if (rankA !== rankB) return rankA - rankB
      const ptsA = typeof a.weeklyPoints === 'number' ? a.weeklyPoints : 0
      const ptsB = typeof b.weeklyPoints === 'number' ? b.weeklyPoints : 0
      if (ptsA !== ptsB) return ptsB - ptsA
      return String(a.displayName || '').localeCompare(String(b.displayName || ''))
    })
  }

  return merged
}

/**
 * True when the week has no saved pick cards (neither live nor standings data).
 *
 * @param {unknown[] | null | undefined} mergedRankings
 * @param {boolean} weeklyLoading
 */
export function shouldShowWeeklyStandingsEmpty(mergedRankings, weeklyLoading) {
  if (weeklyLoading) return false
  return !mergedRankings || mergedRankings.length === 0
}

/**
 * @param {unknown[] | undefined | null} mergedRankings
 */
export function hasWeeklyRankingsTableRows(mergedRankings) {
  return Array.isArray(mergedRankings) && mergedRankings.length > 0
}