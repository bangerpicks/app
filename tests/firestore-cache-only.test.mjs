import { test } from 'node:test'
import assert from 'node:assert/strict'

// Keep in sync with src/lib/firestore-server-read.ts cache fallback rules

class FirestoreServedFromCacheError extends Error {
  constructor(message) {
    super(message)
    this.name = 'FirestoreServedFromCacheError'
  }
}

function rejectEmptyCacheFallback(snapshot, timeoutMessage) {
  if (snapshot.empty) {
    throw new FirestoreServedFromCacheError(timeoutMessage)
  }
}

test('empty cache fallback is always an error', () => {
  assert.throws(
    () =>
      rejectEmptyCacheFallback(
        { empty: true, metadata: { fromCache: false } },
        'Failed to load gameweeks - request timed out'
      ),
    FirestoreServedFromCacheError
  )
  assert.throws(
    () =>
      rejectEmptyCacheFallback(
        { empty: true, metadata: { fromCache: true } },
        'Failed to load gameweeks - request timed out'
      ),
    FirestoreServedFromCacheError
  )
})

test('non-empty cache fallback is allowed (stale)', () => {
  assert.doesNotThrow(() =>
    rejectEmptyCacheFallback(
      { empty: false, metadata: { fromCache: true } },
      'Failed to load gameweek fixtures - request timed out'
    )
  )
})