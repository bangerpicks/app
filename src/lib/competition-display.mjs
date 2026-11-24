/**
 * Locale-aware competition strings for dashboard cards (keep in sync with competition-display.ts).
 */

/**
 * @param {{ displayName: string, displayName_esMX?: string }} competition
 * @param {string} locale
 */
export function resolveCompetitionDisplayName(competition, locale) {
  const isEs = locale === 'es-MX'
  return isEs && competition.displayName_esMX
    ? competition.displayName_esMX
    : competition.displayName
}

/**
 * @param {{
 *   tagline?: string
 *   tagline_esMX?: string
 * }} competition
 * @param {{ description?: string }} gameweek
 * @param {string} locale
 */
export function resolveCompetitionCardSubtitle(competition, gameweek, locale) {
  const isEs = locale === 'es-MX'
  if (isEs) {
    const line =
      competition.tagline_esMX?.trim() ||
      competition.tagline?.trim() ||
      gameweek.description?.trim()
    return line || undefined
  }

  const enTagline = competition.tagline?.trim()
  if (enTagline) return enTagline
  return undefined
}

/**
 * Same gameweek header copy on dashboard and picks when a competition is linked.
 * @param {{ name?: string, description?: string }} gameweek
 * @param {{ displayName: string, displayName_esMX?: string, tagline?: string, tagline_esMX?: string }} competition
 * @param {string} locale
 */
export function brandGameweekForCompetition(gameweek, competition, locale) {
  if (!competition) return gameweek
  return {
    ...gameweek,
    name: resolveCompetitionDisplayName(competition, locale),
    description: resolveCompetitionCardSubtitle(competition, gameweek, locale),
  }
}