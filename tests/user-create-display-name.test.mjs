import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { displayNameForUserCreate } from '../src/lib/user-create-display-name.mjs'

describe('displayNameForUserCreate (Firestore validUserCreate)', () => {
  it('uses Player when auth name is empty, whitespace, or shorter than 2 chars', () => {
    assert.equal(displayNameForUserCreate(null), 'Player')
    assert.equal(displayNameForUserCreate(''), 'Player')
    assert.equal(displayNameForUserCreate('   '), 'Player')
    assert.equal(displayNameForUserCreate('A'), 'Player')
  })

  it('keeps valid auth names between 2 and 30 characters', () => {
    assert.equal(displayNameForUserCreate('Jo'), 'Jo')
    assert.equal(displayNameForUserCreate('Player'), 'Player')
    assert.equal(displayNameForUserCreate('  Gaffer  '), 'Gaffer')
  })
})