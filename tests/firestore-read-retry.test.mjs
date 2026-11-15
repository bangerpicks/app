import { test } from 'node:test'
import assert from 'node:assert/strict'

// Keep in sync with src/lib/firestore-utils.ts

function isNonRetryableFirestoreError(error) {
  const code = error?.code
  return code === 'permission-denied' || code === 'not-found'
}

async function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  let timeoutHandle
  const timeout = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
  }
}

async function withRetry(operation, maxRetries = 3, baseDelayMs = 10) {
  let lastError
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (isNonRetryableFirestoreError(error)) {
        throw error
      }
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

async function readWithTimeoutAndRetry(operation, options = {}) {
  const {
    timeoutMs = 50,
    timeoutMessage = 'Operation timed out',
    maxRetries = 3,
    baseDelayMs = 10,
  } = options
  return withRetry(
    () => withTimeout(operation(), timeoutMs, timeoutMessage),
    maxRetries,
    baseDelayMs
  )
}

test('withRetry succeeds after transient failures', async () => {
  let calls = 0
  const result = await withRetry(async () => {
    calls++
    if (calls < 3) {
      throw new Error('network flake')
    }
    return 'ok'
  }, 3, 1)
  assert.equal(result, 'ok')
  assert.equal(calls, 3)
})

test('withRetry does not retry permission-denied', async () => {
  let calls = 0
  await assert.rejects(
    () =>
      withRetry(async () => {
        calls++
        const err = new Error('nope')
        err.code = 'permission-denied'
        throw err
      }),
    (err) => err.code === 'permission-denied'
  )
  assert.equal(calls, 1)
})

test('readWithTimeoutAndRetry retries timed-out operations', async () => {
  let calls = 0
  const result = await readWithTimeoutAndRetry(
    () =>
      new Promise((resolve) => {
        calls++
        if (calls < 2) {
          setTimeout(() => resolve('slow'), 200)
        } else {
          setTimeout(() => resolve('fast'), 5)
        }
      }),
    { timeoutMs: 30, maxRetries: 2, baseDelayMs: 1 }
  )
  assert.equal(result, 'fast')
  assert.equal(calls, 2)
})