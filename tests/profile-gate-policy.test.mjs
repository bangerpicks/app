import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  shouldShowWelcomeIntro,
  shouldShowUsernameNameGate,
} from '../src/lib/profile-gate-policy.mjs'
import {
  readLocalOnboardingSeen,
  writeLocalOnboardingSeen,
  readLocalValidDisplayName,
  writeLocalValidDisplayName,
} from '../src/lib/profile-device-flags.mjs'

describe('profile gate policy', () => {
  it('does not open Welcome on loading, error, or slow (non-loaded) profile', () => {
    for (const status of ['loading', 'error']) {
      assert.equal(
        shouldShowWelcomeIntro({
          status,
          hasSeenOnboardingIntro: false,
          localOnboardingSeen: false,
        }),
        false
      )
    }
  })

  it('does not open username gate on loading or error', () => {
    for (const status of ['loading', 'error']) {
      assert.equal(
        shouldShowUsernameNameGate({
          status,
          displayName: '',
          localValidDisplayName: false,
        }),
        false
      )
    }
  })

  it('local onboarding flag skips Welcome without Firestore loaded', () => {
    assert.equal(
      shouldShowWelcomeIntro({
        status: 'loading',
        hasSeenOnboardingIntro: false,
        localOnboardingSeen: true,
      }),
      false
    )
    assert.equal(
      shouldShowWelcomeIntro({
        status: 'error',
        hasSeenOnboardingIntro: false,
        localOnboardingSeen: true,
      }),
      false
    )
  })

  it('local valid-name flag skips username gate without Firestore loaded', () => {
    assert.equal(
      shouldShowUsernameNameGate({
        status: 'loading',
        displayName: 'Player',
        localValidDisplayName: true,
      }),
      false
    )
  })

  it('opens Welcome only when loaded and profile says not seen', () => {
    assert.equal(
      shouldShowWelcomeIntro({
        status: 'loaded',
        hasSeenOnboardingIntro: false,
        localOnboardingSeen: false,
      }),
      true
    )
    assert.equal(
      shouldShowWelcomeIntro({
        status: 'loaded',
        hasSeenOnboardingIntro: true,
        localOnboardingSeen: false,
      }),
      false
    )
  })

  it('opens username gate only when loaded and display name is missing', () => {
    assert.equal(
      shouldShowUsernameNameGate({
        status: 'loaded',
        displayName: 'Player',
        localValidDisplayName: false,
      }),
      true
    )
    assert.equal(
      shouldShowUsernameNameGate({
        status: 'loaded',
        displayName: 'Gaffer',
        localValidDisplayName: false,
      }),
      false
    )
  })
})

describe('profile device flags', () => {
  it('persists onboarding and valid-name flags per uid', () => {
    const store = new Map()
    const storage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
    }
    writeLocalOnboardingSeen(storage, 'uid-a')
    writeLocalValidDisplayName(storage, 'uid-a')
    assert.equal(readLocalOnboardingSeen(storage, 'uid-a'), true)
    assert.equal(readLocalValidDisplayName(storage, 'uid-a'), true)
    assert.equal(readLocalOnboardingSeen(storage, 'uid-b'), false)
  })
})