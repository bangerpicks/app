import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  mergeSavedPredictions,
  reconcilePendingAfterSave,
  savePicksErrorKey,
} from '../src/lib/picks-save-optimistic.mjs'
import en from '../src/messages/en.json' with { type: 'json' }
import es from '../src/messages/es-MX.json' with { type: 'json' }

describe('optimistic picks save (v1.2.11)', () => {
  it('keeps taps made while a save was in flight', () => {
    const pending = new Map([[1, 'H'], [2, 'A'], [3, 'D']])
    const sent = new Map([[1, 'H'], [2, 'D'], [4, 'H']])
    assert.deepEqual([...reconcilePendingAfterSave(pending, sent)], [[2, 'A'], [3, 'D']])
  })

  it('overlays server-confirmed picks onto refreshed matches', () => {
    const matches = [{ fixtureId: 1, userPrediction: 'H' }, { fixtureId: 2, userPrediction: null }, { fixtureId: 3 }]
    const confirmed = new Map([[2, 'A'], [9, 'H']])
    assert.deepEqual([...mergeSavedPredictions(matches, confirmed)], [[1, 'H'], [2, 'A']])
  })
})

describe('savePicksErrorKey', () => {
  const cases = [
    [{ code: 'functions/failed-precondition', message: 'Picks are closed for this gameweek' }, 'gameweekClosed'],
    [{ code: 'functions/failed-precondition', message: 'Picks are closed for fixture 101' }, 'saveErrorMatchStarted'],
    [{ code: 'functions/failed-precondition', message: 'Fixture 101 is already scored' }, 'saveErrorMatchStarted'],
    [{ code: 'functions/failed-precondition', message: 'App is in maintenance mode' }, 'saveErrorMaintenance'],
    [{ code: 'functions/invalid-argument', message: 'All 10 matches must have a pick' }, 'saveRequiresAllPicks'],
    [{ code: 'functions/invalid-argument', message: 'Fixture 9 is not in this gameweek' }, 'saveErrorCardOutdated'],
    [{ code: 'functions/not-found', message: 'Gameweek not found' }, 'saveErrorCardOutdated'],
    [{ code: 'functions/permission-denied', message: 'REGISTRATION_CLOSED' }, 'saveErrorInviteOnly'],
    [{ name: 'RegistrationClosedError', message: 'REGISTRATION_CLOSED' }, 'saveErrorInviteOnly'],
    [{ code: 'functions/unauthenticated', message: 'Must be signed in' }, 'saveErrorSignIn'],
    [{ code: 'functions/internal', message: 'boom' }, 'saveErrorGeneric'],
    [null, 'saveErrorGeneric'],
  ]
  for (const [err, key] of cases) {
    it(`${err?.code ?? err?.name ?? 'null'} / ${err?.message ?? ''} -> ${key}`, () => {
      assert.equal(savePicksErrorKey(err), key)
    })
  }

  it('every key it can return exists in en and es-MX', () => {
    for (const [, key] of cases) {
      assert.ok(en.dashboard[key], `en missing ${key}`)
      assert.ok(es.dashboard[key], `es-MX missing ${key}`)
      assert.notEqual(en.dashboard[key], es.dashboard[key])
    }
  })
})
