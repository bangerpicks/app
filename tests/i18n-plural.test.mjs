import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pickPluralKey } from '../src/lib/i18n-plural.mjs'

describe('pickPluralKey', () => {
  it('uses the singular key only for count === 1', () => {
    assert.equal(pickPluralKey(1, 'one', 'many'), 'one')
    assert.equal(pickPluralKey(0, 'one', 'many'), 'many')
    assert.equal(pickPluralKey(2, 'one', 'many'), 'many')
    assert.equal(pickPluralKey(42, 'one', 'many'), 'many')
  })
})