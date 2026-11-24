/**
 * v1.2.11: build the Rankings "picks" columns from server-written weeklyStandings
 * (`entries[].picks`, present only after lock). Pure; shared by rankings.ts and tests.
 */

/**
 * @param {number[]} fixtureIds
 * @param {Map<number, { homeTeam: any, awayTeam: any }>} fixtureDetailsMap
 * @param {Record<string, { p: string, c: boolean | null }> | null | undefined} picks
 * @returns {Array<{ fixtureId: number, prediction: 'H'|'D'|'A'|null, homeTeam: any, awayTeam: any, correct: boolean | null }>}
 */
export function matchPredictionsFromStandingsPicks(fixtureIds, fixtureDetailsMap, picks) {
  if (!picks || typeof picks !== 'object') return []
  const out = []
  for (const fixtureId of fixtureIds) {
    const detail = fixtureDetailsMap.get(fixtureId)
    if (!detail) continue
    const row = picks[String(fixtureId)]
    const p = row && (row.p === 'H' || row.p === 'D' || row.p === 'A') ? row.p : null
    out.push({
      fixtureId,
      prediction: p,
      homeTeam: detail.homeTeam,
      awayTeam: detail.awayTeam,
      correct: p && typeof row.c === 'boolean' ? row.c : null,
    })
  }
  return out
}
