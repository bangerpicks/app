import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  fetchFixturesByIdsBatched,
  ApiFootballRateLimitError,
  resetApiFootballRateLimitWarning,
  logApiFootballRateLimitWarning,
} from '../lib/api-football-client.js'

describe('fetchFixturesByIdsBatched', () => {
  it('throws ApiFootballRateLimitError on 429 without retrying', async () => {
    const fetchFn = mock.fn(async () => ({
      status: 429,
      ok: false,
      text: async () => 'too many requests',
    }))

    await assert.rejects(
      () => fetchFixturesByIdsBatched('test-key', [1, 2], fetchFn),
      (err) => err instanceof ApiFootballRateLimitError
    )
    assert.equal(fetchFn.mock.callCount(), 1)
  })

  it('batches requests in chunks of 20', async () => {
    const ids = Array.from({ length: 25 }, (_, i) => i + 1)
    const fetchFn = mock.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ response: [] }),
    }))

    await fetchFixturesByIdsBatched('test-key', ids, fetchFn)
    assert.equal(fetchFn.mock.callCount(), 2)
  })
})

describe('rate limit warning', () => {
  it('logs at most once per tick', () => {
    resetApiFootballRateLimitWarning()
    const original = console.warn
    let count = 0
    console.warn = () => {
      count++
    }
    try {
      logApiFootballRateLimitWarning('testFn')
      logApiFootballRateLimitWarning('testFn')
      assert.equal(count, 1)
    } finally {
      console.warn = original
    }
  })
})
