import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import admin from 'firebase-admin'
import { executeSaveGameweekPicks } from '../lib/save-gameweek-picks.js'
import { planSaveGameweekPicks } from '../lib/save-gameweek-picks-plan.js'
import { createFakeDb } from './fake-firestore.mjs'

const { Timestamp } = admin.firestore
const NOW = Date.UTC(2026, 10, 25, 18, 0, 0) // fixed clock
const HOUR = 3600_000
const UID = 'user-1'
const OPEN_GW = 'open-gw'
const CLOSED_GW = 'closed-gw'

function fixtureDoc(id, status, kickoffMs, extra = {}) {
  return {
    fixtureId: id,
    fixture: {
      fixture: { id, status: { short: status }, timestamp: Math.floor(kickoffMs / 1000) },
      teams: { home: { id: id * 10, name: `Home ${id}`, logo: 'h.png' }, away: { id: id * 10 + 1, name: `Away ${id}`, logo: 'a.png' } },
      league: { id: 262, name: 'Liga MX', country: 'Mexico', logo: 'l.png' },
      goals: { home: null, away: null },
    },
    ...extra,
  }
}

function seed({ lockOffsetMs = HOUR, forceOpen = false, userExists = true, maintenance = false, fixtures, entries = {} } = {}) {
  const s = {
    'settings/app': maintenance ? { maintenanceMode: true } : {},
    [`gameweeks/${OPEN_GW}`]: {
      status: 'active',
      lockAt: Timestamp.fromMillis(NOW + lockOffsetMs),
      forceOpenForTesting: forceOpen,
      fixtureIds: [101, 102],
    },
    [`gameweeks/${CLOSED_GW}`]: { status: 'completed', lockAt: Timestamp.fromMillis(NOW - 48 * HOUR), fixtureIds: [900] },
    [`gameweeks/${CLOSED_GW}/fixtures/900`]: fixtureDoc(900, 'FT', NOW - 30 * HOUR),
    'predictions/900/entries/user-1': { uid: UID, fixtureId: 900, gameweekId: CLOSED_GW, pick: 'A', awarded: true, points: 0, correct: false },
  }
  if (userExists) s[`users/${UID}`] = { displayName: 'Martin' }
  const fx = fixtures ?? [fixtureDoc(101, 'NS', NOW + 2 * HOUR), fixtureDoc(102, 'NS', NOW + 3 * HOUR)]
  for (const f of fx) s[`gameweeks/${OPEN_GW}/fixtures/${f.fixtureId}`] = f
  for (const [path, data] of Object.entries(entries)) s[path] = data
  return createFakeDb(s)
}

async function rejects(promise, code, re) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.code, code, `expected ${code}, got ${err.code}: ${err.message}`)
    if (re) assert.match(err.message, re)
    return true
  })
}

const run = (db, picks, extra = {}) =>
  executeSaveGameweekPicks(db, UID, { gameweekId: OPEN_GW, picks, ...extra }, NOW)

describe('saveGameweekPicks (server-trusted slate, v1.2.11)', () => {
  it('saves a complete card, joins once, and marks weeklyStandings dirty', async () => {
    const db = seed()
    const res = await run(db, [{ fixtureId: 101, pick: 'H' }, { fixtureId: 102, pick: 'D' }])
    assert.equal(res.joinedGameweek, true)
    const e = db.store.get('predictions/101/entries/user-1')
    assert.equal(e.pick, 'H')
    assert.equal(e.awarded, false)
    assert.equal(e.gameweekId, OPEN_GW)
    assert.equal(e.homeTeam.name, 'Home 101') // from the server fixture, not the client
    assert.equal(e.status, 'NS')
    assert.equal(db.store.get(`users/${UID}/gameweek_predictions/${OPEN_GW}`).joinedFixtureId, '101')
    assert.ok(db.store.get(`weeklyStandings/${OPEN_GW}`).dirtyAt)
  })

  it('rejects a crafted pick on a finished fixture from another round (and leaves the scored entry alone)', async () => {
    const db = seed()
    await rejects(
      run(db, [{ fixtureId: 101, pick: 'H' }, { fixtureId: 102, pick: 'D' }, { fixtureId: 900, pick: 'H' }]),
      'invalid-argument',
      /not in this gameweek/
    )
    const scored = db.store.get('predictions/900/entries/user-1')
    assert.equal(scored.awarded, true)
    assert.equal(scored.pick, 'A')
    assert.equal(db.writes.length, 0)
  })

  it('rejects a partial slate (exact match with the round is required)', async () => {
    await rejects(run(seed(), [{ fixtureId: 101, pick: 'H' }]), 'invalid-argument', /All 2 matches/)
  })

  it('rejects duplicate and malformed picks', async () => {
    await rejects(run(seed(), [{ fixtureId: 101, pick: 'H' }, { fixtureId: 101, pick: 'A' }]), 'invalid-argument')
    await rejects(run(seed(), [{ fixtureId: 101, pick: 'X' }, { fixtureId: 102, pick: 'D' }]), 'invalid-argument')
  })

  it('rejects after the gameweek lock', async () => {
    await rejects(
      run(seed({ lockOffsetMs: -1 }), [{ fixtureId: 101, pick: 'H' }, { fixtureId: 102, pick: 'D' }]),
      'failed-precondition',
      /closed for this gameweek/
    )
  })

  it('ignores client-supplied status: server FT beats client NS', async () => {
    const db = seed({
      forceOpen: true,
      fixtures: [fixtureDoc(101, 'FT', NOW - 3 * HOUR), fixtureDoc(102, 'NS', NOW + HOUR)],
    })
    await rejects(
      run(db, [{ fixtureId: 101, pick: 'H' }, { fixtureId: 102, pick: 'D' }], {
        matches: [{ fixtureId: 101, matchStatus: 'NS' }, { fixtureId: 102, matchStatus: 'NS' }],
      }),
      'failed-precondition',
      /fixture 101/
    )
  })

  it('rejects a change once kickoff time has passed even if the API still says NS', async () => {
    const db = seed({
      forceOpen: true,
      fixtures: [fixtureDoc(101, 'NS', NOW - 60_000), fixtureDoc(102, 'NS', NOW + HOUR)],
    })
    await rejects(run(db, [{ fixtureId: 101, pick: 'A' }, { fixtureId: 102, pick: 'D' }]), 'failed-precondition')
  })

  it('never touches an already-scored entry (unchanged pick is a no-op, changed pick is refused)', async () => {
    const scoredPath = 'predictions/101/entries/user-1'
    const entries = {
      [scoredPath]: { uid: UID, fixtureId: 101, gameweekId: OPEN_GW, pick: 'H', awarded: true, points: 3, correct: true },
      'predictions/102/entries/user-1': { uid: UID, fixtureId: 102, gameweekId: OPEN_GW, pick: 'D', awarded: false, points: 0 },
    }
    const fixtures = [fixtureDoc(101, 'FT', NOW - 3 * HOUR), fixtureDoc(102, 'NS', NOW + HOUR)]
    const db1 = seed({ forceOpen: true, fixtures, entries })
    const res = await run(db1, [{ fixtureId: 101, pick: 'H' }, { fixtureId: 102, pick: 'A' }])
    assert.equal(res.joinedGameweek, false)
    assert.deepEqual(db1.store.get(scoredPath), entries[scoredPath])
    const changed = db1.store.get('predictions/102/entries/user-1')
    assert.equal(changed.pick, 'A')
    assert.equal(changed.awarded, false)
    assert.ok(!db1.writes.some((w) => w.path === scoredPath))

    const db2 = seed({ forceOpen: true, fixtures, entries })
    await rejects(run(db2, [{ fixtureId: 101, pick: 'A' }, { fixtureId: 102, pick: 'A' }]), 'failed-precondition', /already scored|closed/)
    assert.deepEqual(db2.store.get(scoredPath), entries[scoredPath])
  })

  it('a pick change only writes `pick` (no awarded/points reset)', async () => {
    const path = 'predictions/101/entries/user-1'
    const entries = {
      [path]: { uid: UID, fixtureId: 101, gameweekId: OPEN_GW, pick: 'H', awarded: false, points: 0, correct: null, marker: 'keep' },
      'predictions/102/entries/user-1': { uid: UID, fixtureId: 102, gameweekId: OPEN_GW, pick: 'D', awarded: false, points: 0 },
    }
    const db = seed({ entries })
    await run(db, [{ fixtureId: 101, pick: 'A' }, { fixtureId: 102, pick: 'D' }])
    const upd = db.writes.find((w) => w.path === path)
    assert.deepEqual(upd, { op: 'update', path, data: { pick: 'A' } })
    assert.equal(db.store.get(path).marker, 'keep')
  })

  it('refuses accounts without a users/{uid} profile (invite gate)', async () => {
    await rejects(
      run(seed({ userExists: false }), [{ fixtureId: 101, pick: 'H' }, { fixtureId: 102, pick: 'D' }]),
      'permission-denied',
      /REGISTRATION_CLOSED/
    )
  })

  it('refuses while maintenanceMode is on', async () => {
    await rejects(
      run(seed({ maintenance: true }), [{ fixtureId: 101, pick: 'H' }, { fixtureId: 102, pick: 'D' }]),
      'failed-precondition',
      /maintenance/
    )
  })

  it('refuses to move an entry that belongs to another gameweek', async () => {
    const entries = {
      'predictions/101/entries/user-1': { uid: UID, fixtureId: 101, gameweekId: 'other-gw', pick: 'H', awarded: false },
    }
    await rejects(run(seed({ entries }), [{ fixtureId: 101, pick: 'A' }, { fixtureId: 102, pick: 'D' }]), 'failed-precondition', /another gameweek/)
  })

  it('rejects an unknown gameweek id and bad ids', async () => {
    await rejects(executeSaveGameweekPicks(seed(), UID, { gameweekId: 'nope', picks: [{ fixtureId: 1, pick: 'H' }] }, NOW), 'not-found')
    await rejects(executeSaveGameweekPicks(seed(), UID, { gameweekId: '../x', picks: [{ fixtureId: 1, pick: 'H' }] }, NOW), 'invalid-argument')
  })
})

describe('planSaveGameweekPicks (pure)', () => {
  const gw = { status: 'active', lockAtMs: NOW + HOUR, forceOpenForTesting: false }
  const fixtures = [
    { fixtureId: 1, statusShort: 'NS', kickoffMs: NOW + 2 * HOUR },
    { fixtureId: 2, statusShort: 'TBD', kickoffMs: null },
  ]
  it('unchanged picks produce no writes', () => {
    const r = planSaveGameweekPicks({
      gameweekId: 'g', gameweek: gw, fixtures, nowMs: NOW,
      picks: [{ fixtureId: 1, pick: 'H' }, { fixtureId: 2, pick: 'D' }],
      existingEntries: new Map([[1, { pick: 'H', awarded: false, gameweekId: 'g' }], [2, { pick: 'D', awarded: false, gameweekId: 'g' }]]),
    })
    assert.equal(r.ok, true)
    assert.deepEqual(r.writes, [])
    assert.deepEqual(r.mergedPredictions, { 1: 'H', 2: 'D' })
  })
  it('inactive gameweek is closed even with forceOpen', () => {
    const r = planSaveGameweekPicks({
      gameweekId: 'g', gameweek: { ...gw, status: 'completed', forceOpenForTesting: true }, fixtures, nowMs: NOW,
      picks: [{ fixtureId: 1, pick: 'H' }, { fixtureId: 2, pick: 'D' }], existingEntries: new Map(),
    })
    assert.equal(r.ok, false)
    assert.equal(r.code, 'failed-precondition')
  })
})
