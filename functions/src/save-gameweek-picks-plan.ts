/**
 * Pure planning/validation for the saveGameweekPicks callable (v1.2.11).
 *
 * Everything that decides *whether* a pick may be written comes from server-side
 * data (the gameweek doc, its fixtures subcollection and the user's existing
 * entries). Client-supplied match metadata (status, score, teams) is never trusted.
 */

export type Pick = 'H' | 'D' | 'A'

export const PICKABLE_STATUSES = new Set(['NS', 'TBD'])

export type PlanGameweek = {
  status: string | undefined
  /** lockAt ?? deadline, in ms. */
  lockAtMs: number | null
  forceOpenForTesting: boolean
}

export type PlanFixture = {
  fixtureId: number
  statusShort: string
  /** Kickoff in ms (fixture.timestamp * 1000), or null if unknown. */
  kickoffMs: number | null
}

export type PlanExistingEntry = {
  pick: string | undefined
  awarded: boolean
  gameweekId: string | undefined
}

export type PlanInput = {
  gameweekId: string
  gameweek: PlanGameweek
  fixtures: PlanFixture[]
  picks: Array<{ fixtureId: unknown; pick: unknown }>
  existingEntries: Map<number, PlanExistingEntry>
  nowMs: number
}

export type PlanErrorCode = 'invalid-argument' | 'failed-precondition'

export type PlanResult =
  | {
      ok: true
      /** Fixtures to write, ascending. isNew = no entry existed. */
      writes: Array<{ fixtureId: number; pick: Pick; isNew: boolean }>
      /** Every pick for this gameweek after the save (existing + writes). */
      mergedPredictions: Record<string, Pick>
    }
  | { ok: false; code: PlanErrorCode; message: string }

function fail(code: PlanErrorCode, message: string): PlanResult {
  return { ok: false, code, message }
}

export function isFixturePickable(fixture: PlanFixture, nowMs: number): boolean {
  if (!PICKABLE_STATUSES.has(fixture.statusShort || 'NS')) return false
  if (fixture.kickoffMs != null && nowMs >= fixture.kickoffMs) return false
  return true
}

export function isGameweekWindowOpen(gameweek: PlanGameweek, nowMs: number): boolean {
  if (gameweek.status !== 'active') return false
  if (gameweek.forceOpenForTesting) return true
  if (gameweek.lockAtMs == null) return false
  return nowMs < gameweek.lockAtMs
}

function isPick(value: unknown): value is Pick {
  return value === 'H' || value === 'D' || value === 'A'
}

export function planSaveGameweekPicks(input: PlanInput): PlanResult {
  const { gameweek, fixtures, picks, existingEntries, nowMs, gameweekId } = input

  if (!Array.isArray(picks) || picks.length === 0) {
    return fail('invalid-argument', 'picks are required')
  }

  if (!isGameweekWindowOpen(gameweek, nowMs)) {
    return fail('failed-precondition', 'Picks are closed for this gameweek')
  }

  if (fixtures.length === 0) {
    return fail('failed-precondition', 'This gameweek has no fixtures')
  }

  const fixtureById = new Map<number, PlanFixture>()
  for (const f of fixtures) fixtureById.set(f.fixtureId, f)

  const requested = new Map<number, Pick>()
  for (const p of picks) {
    if (typeof p?.fixtureId !== 'number' || !Number.isInteger(p.fixtureId) || !isPick(p?.pick)) {
      return fail('invalid-argument', 'Invalid pick payload')
    }
    if (requested.has(p.fixtureId)) {
      return fail('invalid-argument', `Duplicate pick for fixture ${p.fixtureId}`)
    }
    if (!fixtureById.has(p.fixtureId)) {
      return fail('invalid-argument', `Fixture ${p.fixtureId} is not in this gameweek`)
    }
    requested.set(p.fixtureId, p.pick)
  }

  // The slate is exact: one pick for every fixture in the round, nothing else.
  if (requested.size !== fixtures.length) {
    return fail('invalid-argument', `All ${fixtures.length} matches must have a pick`)
  }

  const writes: Array<{ fixtureId: number; pick: Pick; isNew: boolean }> = []
  const merged: Record<string, Pick> = {}

  for (const [fixtureId, existing] of existingEntries) {
    if (fixtureById.has(fixtureId) && isPick(existing.pick)) {
      merged[String(fixtureId)] = existing.pick
    }
  }

  const orderedIds = [...requested.keys()].sort((a, b) => a - b)
  for (const fixtureId of orderedIds) {
    const pick = requested.get(fixtureId)!
    const fixture = fixtureById.get(fixtureId)!
    const existing = existingEntries.get(fixtureId)

    if (existing && existing.pick === pick) {
      continue // unchanged: never rewritten (keeps awarded/points/result intact)
    }
    if (existing && existing.gameweekId && existing.gameweekId !== gameweekId) {
      return fail(
        'failed-precondition',
        `Fixture ${fixtureId} already has a pick in another gameweek`
      )
    }
    if (existing?.awarded) {
      return fail('failed-precondition', `Fixture ${fixtureId} is already scored`)
    }
    if (!isFixturePickable(fixture, nowMs)) {
      return fail('failed-precondition', `Picks are closed for fixture ${fixtureId}`)
    }
    writes.push({ fixtureId, pick, isNew: !existing })
    merged[String(fixtureId)] = pick
  }

  return { ok: true, writes, mergedPredictions: merged }
}
