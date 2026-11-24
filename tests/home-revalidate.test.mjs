import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  loadHomeStaleWhileRevalidate,
  shouldRefetchHomeOnResume,
  homeCatalogSignature,
  resolveLiveCatalogChange,
  HOME_RESUME_REFETCH_MIN_MS,
} from '../src/lib/home-revalidate.mjs'

describe('loadHomeStaleWhileRevalidate', () => {
  it('paints cache first, then always replaces it with the server result', async () => {
    const applied = []
    let serverCalls = 0
    const res = await loadHomeStaleWhileRevalidate({
      loadCacheFirst: async () => ({ data: 'cached-no-liguilla', servedFromCache: true }),
      loadServer: async () => {
        serverCalls++
        return { data: 'server-with-liguilla', servedFromCache: false }
      },
      apply: (data, meta) => applied.push([data, meta.stale, meta.phase]),
    })
    assert.equal(serverCalls, 1)
    assert.deepEqual(applied, [
      ['cached-no-liguilla', false, 'initial'],
      ['server-with-liguilla', false, 'revalidate'],
    ])
    assert.equal(res.serverConfirmed, true)
  })

  it('skips the second read when the first pass already came from the server', async () => {
    let serverCalls = 0
    const applied = []
    const res = await loadHomeStaleWhileRevalidate({
      loadCacheFirst: async () => ({ data: 'server', servedFromCache: false }),
      loadServer: async () => {
        serverCalls++
        return { data: 'x', servedFromCache: false }
      },
      apply: (data) => applied.push(data),
    })
    assert.equal(serverCalls, 0)
    assert.deepEqual(applied, ['server'])
    assert.equal(res.serverConfirmed, true)
  })

  it('keeps cached data and marks it stale when the server pass fails', async () => {
    const applied = []
    const res = await loadHomeStaleWhileRevalidate({
      loadCacheFirst: async () => ({ data: 'cached', servedFromCache: true }),
      loadServer: async () => {
        throw new Error('offline')
      },
      apply: (data, meta) => applied.push([data, meta.stale]),
    })
    assert.deepEqual(applied.at(-1), ['cached', true])
    assert.equal(res.serverConfirmed, false)
  })

  it('marks stale when the server pass only returns cache fallback', async () => {
    const applied = []
    await loadHomeStaleWhileRevalidate({
      loadCacheFirst: async () => ({ data: 'c1', servedFromCache: true }),
      loadServer: async () => ({ data: 'c2', servedFromCache: true }),
      apply: (data, meta) => applied.push([data, meta.stale]),
    })
    assert.deepEqual(applied.at(-1), ['c2', true])
  })

  it('does not apply server data after cancellation', async () => {
    const applied = []
    let cancelled = false
    await loadHomeStaleWhileRevalidate({
      loadCacheFirst: async () => ({ data: 'cached', servedFromCache: true }),
      loadServer: async () => {
        cancelled = true
        return { data: 'server', servedFromCache: false }
      },
      apply: (data) => applied.push(data),
      isCancelled: () => cancelled,
    })
    assert.deepEqual(applied, ['cached'])
  })
})

describe('shouldRefetchHomeOnResume', () => {
  it('refetches when visible and the last server load is old enough', () => {
    assert.equal(
      shouldRefetchHomeOnResume({ visible: true, inFlight: false, lastServerLoadAtMs: 1, nowMs: 1 + HOME_RESUME_REFETCH_MIN_MS }),
      true
    )
  })
  it('throttles, and skips hidden tabs or in-flight loads', () => {
    assert.equal(shouldRefetchHomeOnResume({ visible: true, inFlight: false, lastServerLoadAtMs: 1000, nowMs: 2000 }), false)
    assert.equal(shouldRefetchHomeOnResume({ visible: false, inFlight: false, lastServerLoadAtMs: 0 }), false)
    assert.equal(shouldRefetchHomeOnResume({ visible: true, inFlight: true, lastServerLoadAtMs: 0 }), false)
  })
  it('refetches when the server was never confirmed', () => {
    assert.equal(shouldRefetchHomeOnResume({ visible: true, inFlight: false, lastServerLoadAtMs: 0 }), true)
  })
})

describe('live catalog change detection', () => {
  const comps = [{ id: 'liguilla-loca', data: { status: 'active', activeGameweekId: null } }]
  const gws = [{ id: 'gw-mm1', data: { status: 'active', playerCount: 4 } }]
  const base = homeCatalogSignature(comps, gws)

  it('ignores counter-only changes (playerCount)', () => {
    const next = homeCatalogSignature(comps, [{ id: 'gw-mm1', data: { status: 'active', playerCount: 9 } }])
    assert.equal(next, base)
  })
  it('detects a published round, activeGameweekId switch, and close-out', () => {
    const published = homeCatalogSignature(comps, [...gws, { id: 'liguilla-qf', data: { status: 'active' } }])
    const switched = homeCatalogSignature(
      [{ id: 'liguilla-loca', data: { status: 'active', activeGameweekId: 'liguilla-qf' } }],
      gws
    )
    const closed = homeCatalogSignature(comps, [])
    for (const next of [published, switched, closed]) {
      assert.notEqual(next, base)
      assert.deepEqual(resolveLiveCatalogChange({ baseline: base, next, fromCache: false }), {
        reload: true,
        baseline: next,
      })
    }
  })
  it('first server snapshot is the baseline; cache snapshots never trigger', () => {
    assert.deepEqual(resolveLiveCatalogChange({ baseline: null, next: base, fromCache: false }), {
      reload: false,
      baseline: base,
    })
    assert.equal(resolveLiveCatalogChange({ baseline: base, next: 'other', fromCache: true }).reload, false)
    assert.equal(resolveLiveCatalogChange({ baseline: base, next: base, fromCache: false }).reload, false)
  })
})
