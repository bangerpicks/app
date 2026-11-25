/**
 * Pure helpers for My games card visibility from home membership state.
 */

/**
 * @param {string} competitionId
 * @param {string | null | undefined} cardGameweekId
 * @param {{
 *   dismissedCompetitionIds: string[],
 *   pendingLeaveByCompetitionId: Map<string, string | null | undefined>,
 *   memberCompetitionIds: string[],
 * }} ctx
 */
export function shouldShowHomePlayCard(competitionId, cardGameweekId, ctx) {
  const pending = ctx.pendingLeaveByCompetitionId.get(competitionId)
  if (pending && cardGameweekId && pending === cardGameweekId) {
    return true
  }
  if (ctx.dismissedCompetitionIds.includes(competitionId)) {
    return false
  }
  return true
}

/**
 * @param {string} competitionId
 * @param {{ dismissedCompetitionIds: string[], memberCompetitionIds: string[] }} ctx
 */
export function isCompetitionInMyGames(competitionId, ctx) {
  if (ctx.memberCompetitionIds.includes(competitionId)) return true
  if (ctx.dismissedCompetitionIds.includes(competitionId)) return false
  return false
}