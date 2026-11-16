import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isMissingProfileDisplayName,
  isReservedDisplayName,
  suggestedDisplayNameFromAuth,
} from '../src/lib/display-name.mjs'

describe('display name placeholders', () => {
  it('treats empty, Player, and Jugador as missing (case-insensitive)', () => {
    for (const name of ['', '  ', 'Player', 'player', 'PLAYER', 'Jugador', 'jugador']) {
      assert.equal(isMissingProfileDisplayName(name), true)
      assert.equal(isReservedDisplayName(name), true)
    }
  })

  it('accepts real names', () => {
    assert.equal(isMissingProfileDisplayName('Gaffer'), false)
    assert.equal(isReservedDisplayName('Gaffer'), false)
  })

  it('suggests auth name only when not placeholder', () => {
    assert.equal(suggestedDisplayNameFromAuth('Player'), '')
    assert.equal(suggestedDisplayNameFromAuth('Real Name'), 'Real Name')
  })
})