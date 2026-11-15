import { test } from 'node:test'
import assert from 'node:assert/strict'

// Keep in sync with src/lib/firestore-server-read.ts

class FirestoreServedFromCacheError extends Error {
  constructor(message) {
    super(message)
    this.name = 'FirestoreServedFromCacheError'
  }
}

function rejectIfCacheOnlySnapshot(snapshot, timeoutMessage) {
  if (snapshot.metadata.fromCache) {
    throw new FirestoreServedFromCacheError(timeoutMessage)
  }
}

test('fromCache empty gameweek list is a load failure not no-week', () => {
  assert.throws(
    () =>
      rejectIfCacheOnlySnapshot(
        { metadata: { fromCache: true }, empty: true },
        'Failed to load gameweeks - request timed out'
      ),
  (err) => err instanceof FirestoreServedFromCacheError
  )
})

test('fromCache non-empty snapshot is rejected for dashboard reads', () => {
  assert.throws(
    () =>
      rejectIfCacheOnlySnapshot(
        { metadata: { fromCache: true }, empty: false },
        'Failed to load gameweek fixtures - request timed out'
      ),
    FirestoreServedFromCacheError
  )
})

test('server-empty (not from cache) does not throw', () => {
  assert.doesNotThrow(() =>
    rejectIfCacheOnlySnapshot(
      { metadata: { fromCache: false }, empty: true },
      'Failed to load gameweeks - request timed out'
    )
  )
})