import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  coalesceProfilePhotoUrl,
  normalizeProfilePhotoUrl,
} from '../src/lib/profile-photo.mjs'

describe('profile photo URLs', () => {
  it('normalizes empty strings to null', () => {
    assert.equal(normalizeProfilePhotoUrl(''), null)
    assert.equal(normalizeProfilePhotoUrl('  '), null)
    assert.equal(normalizeProfilePhotoUrl('https://x.test/a'), 'https://x.test/a')
  })

  it('coalesces first usable URL', () => {
    assert.equal(
      coalesceProfilePhotoUrl('', null, 'https://lh3.googleusercontent.com/a'),
      'https://lh3.googleusercontent.com/a'
    )
  })
})