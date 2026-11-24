import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_DISPLAY_NAME,
  isPlaceholderDisplayName,
  needsCustomDisplayNamePrompt,
  normalizeDisplayNameKey,
  shouldReserveDisplayNameClaim,
} from '../src/lib/display-name-claim.mjs'

describe('display-name-claim', () => {
  it('normalizes case-insensitively', () => {
    assert.equal(normalizeDisplayNameKey('  Gaffer '), 'gaffer')
  })

  it('treats Player and Jugador as placeholders', () => {
    assert.equal(isPlaceholderDisplayName('Player'), true)
    assert.equal(isPlaceholderDisplayName('jugador'), true)
    assert.equal(isPlaceholderDisplayName('Gaffer'), false)
  })

  it('does not reserve claims for placeholders', () => {
    assert.equal(shouldReserveDisplayNameClaim('player'), false)
    assert.equal(shouldReserveDisplayNameClaim('gaffer'), true)
  })

  it('needsCustomDisplayNamePrompt prefers profile over auth', () => {
    assert.equal(needsCustomDisplayNamePrompt(null, 'Gaffer'), false)
    assert.equal(needsCustomDisplayNamePrompt('Player', 'Gaffer'), false)
    assert.equal(needsCustomDisplayNamePrompt('Gaffer', DEFAULT_DISPLAY_NAME), true)
    assert.equal(needsCustomDisplayNamePrompt(null, null), true)
  })
})