/**
 * Dashboard GameweekCard header: series title, edition, subtitle, and icon by slate type.
 */

/**
 * @param {{ weekNumber?: number | null, name?: string }} gameweek
 * @returns {number | null}
 */
export function inferWeekNumber(gameweek) {
  if (
    gameweek.weekNumber != null &&
    Number.isFinite(Number(gameweek.weekNumber))
  ) {
    return Number(gameweek.weekNumber)
  }
  const m = /(?:week|wk)\s*#?\s*(\d+)/i.exec(gameweek.name ?? '')
  return m ? Number(m[1]) : null
}

/**
 * @param {string | undefined} type
 * @returns {'flagship' | 'league' | 'cup'}
 */
export function normalizeGameweekType(type) {
  if (type === 'league') return 'league'
  if (type === 'cup') return 'cup'
  return 'flagship'
}

/**
 * @param {{
 *   name: string
 *   type?: string
 *   description?: string
 *   weekNumber?: number | null
 * }} gameweek
 * @param {{
 *   flagshipTitle: string
 *   flagshipSubtitle: string
 *   leagueSubtitle: string
 *   cupSubtitle: string
 *   edition: (week: number) => string
 * }} copy
 * @returns {{
 *   icon: 'globe' | 'trophy' | 'medal'
 *   title: string
 *   subtitle: string
 *   edition: string | null
 * }}
 */
export function resolveGameweekCardBranding(gameweek, copy) {
  const kind = normalizeGameweekType(gameweek.type)
  const description = gameweek.description?.trim() ?? ''
  const weekNum = inferWeekNumber(gameweek)

  if (kind === 'league') {
    return {
      icon: 'trophy',
      title: gameweek.name,
      edition: null,
      subtitle: description || copy.leagueSubtitle,
    }
  }

  if (kind === 'cup') {
    return {
      icon: 'medal',
      title: gameweek.name,
      edition: null,
      subtitle: description || copy.cupSubtitle,
    }
  }

  return {
    icon: 'globe',
    title: copy.flagshipTitle,
    edition: weekNum != null ? copy.edition(weekNum) : null,
    subtitle: description || copy.flagshipSubtitle,
  }
}