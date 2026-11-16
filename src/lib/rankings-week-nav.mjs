/**
 * Week navigation for Rankings "This Week".
 * `navigableWeeks` is ordered newest → oldest: index 0 is the active week.
 */

/**
 * @param {number} selectedWeekIndex
 * @param {number} weekCount
 * @returns {{
 *   canGoToOlderWeek: boolean
 *   canGoToNewerWeek: boolean
 *   olderWeekIndex: number | null
 *   newerWeekIndex: number | null
 * }}
 */
export function weekNavigationState(selectedWeekIndex, weekCount) {
  if (selectedWeekIndex < 0 || weekCount <= 0) {
    return {
      canGoToOlderWeek: false,
      canGoToNewerWeek: false,
      olderWeekIndex: null,
      newerWeekIndex: null,
    }
  }

  const canGoToOlderWeek = selectedWeekIndex < weekCount - 1
  const canGoToNewerWeek = selectedWeekIndex > 0

  return {
    canGoToOlderWeek,
    canGoToNewerWeek,
    olderWeekIndex: canGoToOlderWeek ? selectedWeekIndex + 1 : null,
    newerWeekIndex: canGoToNewerWeek ? selectedWeekIndex - 1 : null,
  }
}