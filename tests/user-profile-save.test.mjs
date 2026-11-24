import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldSkipEnsureUserProfileWrite } from '../src/lib/user-profile-save.mjs'

describe('shouldSkipEnsureUserProfileWrite', () => {
  it('skips when profile is already valid', () => {
    assert.equal(
      shouldSkipEnsureUserProfileWrite(
        { displayName: 'Gaffer', photoURL: null, referralCode: 'ABC123' },
        'Gaffer',
        null
      ),
      true
    )
  })

  it('does not skip when referral code is missing', () => {
    assert.equal(
      shouldSkipEnsureUserProfileWrite({ displayName: 'Gaffer', photoURL: null }, 'Gaffer', null),
      false
    )
  })

  it('skips rename churn when allowRename is false', () => {
    assert.equal(
      shouldSkipEnsureUserProfileWrite(
        { displayName: 'Real Name', photoURL: null, referralCode: 'ABC123' },
        'Player',
        null,
        { allowRename: false }
      ),
      true
    )
  })
})