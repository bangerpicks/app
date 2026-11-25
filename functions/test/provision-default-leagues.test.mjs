import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_LEAGUE_IDS } from '../src/default-league-ids.ts'

test('default league ids include production slates', () => {
  assert.deepEqual([...DEFAULT_LEAGUE_IDS], [
    'banger-world',
    'midweek-mayhem',
    'liguilla-loca',
  ])
})