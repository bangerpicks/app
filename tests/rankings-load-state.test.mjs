import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  resolveWeeklyRankingsSliceStatus,
  resolveWeeklyBoardStatus,
  resolveSeasonBoardStatus,
  shouldShowWeeklyStandingsEmptyCopy,
  shouldShowWeeklyRankingsError,
  shouldShowNoActiveWeekCopy,
  shouldWriteRankingsSessionCache,
  shouldRefetchRankingsOnResume,
  rankingsSimulateHungRead,
  rankingsHungReadGate,
  isRankingsQaHangEnabled,
  RANKINGS_HANG_GATE_TIMEOUT_MESSAGE,
} from '../src/lib/rankings-load-state.mjs'

describe('rankings load state machine', () => {
  it('classifies success with rows as loaded', () => {
    assert.equal(
      resolveWeeklyRankingsSliceStatus({ succeeded: true, rowCount: 3 }),
      'loaded'
    )
  })

  it('classifies success with zero rows as empty', () => {
    assert.equal(
      resolveWeeklyRankingsSliceStatus({ succeeded: true, rowCount: 0 }),
      'empty'
    )
  })

  it('classifies failure as error, never empty', () => {
    assert.equal(
      resolveWeeklyRankingsSliceStatus({ succeeded: false, rowCount: 0 }),
      'error'
    )
  })

  it('weekly board maps load failure to error', () => {
    assert.equal(
      resolveWeeklyBoardStatus({
        loadFailed: true,
        hasGameweek: true,
        fixtureCount: 10,
      }),
      'error'
    )
  })

  it('season board always can finish without weekly', () => {
    assert.equal(
      resolveSeasonBoardStatus({
        loadFailed: false,
        standingsCount: 5,
        hasActiveSeason: true,
      }),
      'ready'
    )
    assert.equal(
      resolveSeasonBoardStatus({
        loadFailed: true,
        standingsCount: 0,
        hasActiveSeason: true,
      }),
      'error'
    )
  })

  it('empty copy only on true empty, not error', () => {
    assert.equal(shouldShowWeeklyStandingsEmptyCopy('ready', 'empty', 0), true)
    assert.equal(shouldShowWeeklyStandingsEmptyCopy('error', 'error', 0), false)
    assert.equal(shouldShowWeeklyStandingsEmptyCopy('ready', 'empty', 3), false)
  })

  it('shows error when header player count conflicts with empty rows', () => {
    assert.equal(shouldShowWeeklyRankingsError(3, 'empty', 'ready'), true)
    assert.equal(shouldShowWeeklyRankingsError(3, 'loaded', 'ready'), false)
    assert.equal(shouldShowWeeklyRankingsError(0, 'error', 'ready'), true)
  })

  it('no-week copy only after successful no-week', () => {
    assert.equal(shouldShowNoActiveWeekCopy('no-week', false), true)
    assert.equal(shouldShowNoActiveWeekCopy('error', false), false)
    assert.equal(shouldShowNoActiveWeekCopy('no-week', true), false)
  })

  it('does not cache empty or failed slices', () => {
    assert.equal(
      shouldWriteRankingsSessionCache(true, { status: 'error', servedFromServer: true }),
      false
    )
    assert.equal(
      shouldWriteRankingsSessionCache(true, { status: 'empty', servedFromServer: false }),
      false
    )
    assert.equal(
      shouldWriteRankingsSessionCache(true, { status: 'loaded', servedFromServer: true }),
      true
    )
  })

  it('resume refetch after failure or stale load', () => {
    assert.equal(shouldRefetchRankingsOnResume({ lastFailed: true, lastLoadAtMs: Date.now() }), true)
    const old = Date.now() - 3 * 60 * 1000
    assert.equal(
      shouldRefetchRankingsOnResume({ lastFailed: false, lastLoadAtMs: old }),
      true
    )
    assert.equal(
      shouldRefetchRankingsOnResume({ lastFailed: false, lastLoadAtMs: Date.now() }),
      false
    )
  })

  it('simulate hung read hook matches label when QA hang is enabled', () => {
    const prev = globalThis.__BANGER_RANKINGS_SIMULATE_HANG__
    const qaEnv = { NODE_ENV: 'development', NEXT_PUBLIC_RANKINGS_QA_HANG: 'true' }
    globalThis.__BANGER_RANKINGS_SIMULATE_HANG__ = 'fixtures'
    assert.equal(rankingsSimulateHungRead('fixtures', { env: qaEnv }), true)
    assert.equal(rankingsSimulateHungRead('entries', { env: qaEnv }), false)
    globalThis.__BANGER_RANKINGS_SIMULATE_HANG__ = prev
  })

  it('simulate hung read is disabled in production without build flag', () => {
    const prev = globalThis.__BANGER_RANKINGS_SIMULATE_HANG__
    globalThis.__BANGER_RANKINGS_SIMULATE_HANG__ = 'fixtures'
    const prodEnv = { NODE_ENV: 'production' }
    assert.equal(isRankingsQaHangEnabled({ env: prodEnv }), false)
    assert.equal(rankingsSimulateHungRead('fixtures', { env: prodEnv }), false)
    globalThis.__BANGER_RANKINGS_SIMULATE_HANG__ = prev
  })

  it('undefined NODE_ENV is treated as production (fail closed)', () => {
    globalThis.__BANGER_RANKINGS_SIMULATE_HANG__ = 'fixtures'
    assert.equal(isRankingsQaHangEnabled({ env: {}, qaQuery: true }), false)
    assert.equal(rankingsSimulateHungRead('fixtures', { env: {}, qaQuery: true }), false)
    delete globalThis.__BANGER_RANKINGS_SIMULATE_HANG__
  })

  it('rankingsHungReadGate rejects when budget expires during simulated hang', async () => {
    const prev = globalThis.__BANGER_RANKINGS_SIMULATE_HANG__
    globalThis.__BANGER_RANKINGS_SIMULATE_HANG__ = 'seasonStandings'
    const qaEnv = { NODE_ENV: 'development', NEXT_PUBLIC_RANKINGS_QA_HANG: 'true' }
    const started = Date.now()
    await assert.rejects(
      () =>
        rankingsHungReadGate('seasonStandings', {
          budgetRemainingMs: 40,
          env: qaEnv,
        }),
      (err) => {
        assert.ok(err instanceof Error)
        assert.equal(err.message, RANKINGS_HANG_GATE_TIMEOUT_MESSAGE)
        return true
      }
    )
    const elapsed = Date.now() - started
    assert.ok(elapsed >= 35 && elapsed < 200, `expected ~40ms, got ${elapsed}ms`)
    globalThis.__BANGER_RANKINGS_SIMULATE_HANG__ = prev
  })

  it('rankingsHungReadGate throws immediately when budget is already exhausted', async () => {
    const qaEnv = { NODE_ENV: 'development', NEXT_PUBLIC_RANKINGS_QA_HANG: 'true' }
    globalThis.__BANGER_RANKINGS_SIMULATE_HANG__ = 'fixtures'
    await assert.rejects(
      () => rankingsHungReadGate('fixtures', { budgetRemainingMs: 0, env: qaEnv }),
      (err) => err.message === RANKINGS_HANG_GATE_TIMEOUT_MESSAGE
    )
    delete globalThis.__BANGER_RANKINGS_SIMULATE_HANG__
  })
})