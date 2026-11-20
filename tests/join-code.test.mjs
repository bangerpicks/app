import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeJoinCode, isValidJoinCodeFormat } from '../src/lib/join-code.mjs'

describe('join-code', () => {
  it('normalizes codes', () => {
    assert.equal(normalizeJoinCode(' ab-12 '), 'AB12')
  })

  it('validates length', () => {
    assert.equal(isValidJoinCodeFormat('ABC'), false)
    assert.equal(isValidJoinCodeFormat('OFFICE2024'), true)
  })
})