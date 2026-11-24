import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  coalesceProfilePhotoUrl,
  normalizeProfilePhotoUrl,
} from '../src/lib/profile-photo.mjs'
import { isAllowedProfilePhotoUrl } from '../src/lib/profile-photo-allowlist.mjs'

describe('profile photo URLs', () => {
  it('normalizes empty strings to null', () => {
    assert.equal(normalizeProfilePhotoUrl(''), null)
    assert.equal(normalizeProfilePhotoUrl('  '), null)
    assert.equal(normalizeProfilePhotoUrl('https://evil.test/a'), null)
  })

  it('allows trusted hosts only', () => {
    assert.equal(
      isAllowedProfilePhotoUrl('https://lh3.googleusercontent.com/a/photo'),
      true
    )
    assert.equal(
      isAllowedProfilePhotoUrl('https://media.api-sports.io/football/players/1.png'),
      true
    )
    assert.equal(normalizeProfilePhotoUrl('https://lh3.googleusercontent.com/a'), 'https://lh3.googleusercontent.com/a')
  })

  it('coalesces first usable URL', () => {
    assert.equal(
      coalesceProfilePhotoUrl('', null, 'https://lh3.googleusercontent.com/a'),
      'https://lh3.googleusercontent.com/a'
    )
    assert.equal(coalesceProfilePhotoUrl('https://evil.test/x'), null)
  })
})