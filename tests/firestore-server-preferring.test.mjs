import { test } from 'node:test'
import assert from 'node:assert/strict'

// Keep in sync with src/lib/firestore-server-read.ts

function resolvePreferringQueryReadUiState(params) {
  if (params.serverSucceeded) {
    return params.serverDocCount === 0 ? 'server-empty-no-week' : 'server-data'
  }
  if (params.fallbackDocCount > 0) {
    return 'cache-fallback-data'
  }
  return 'error'
}

function mapPreferringResultToDashboardState(result) {
  const ui = resolvePreferringQueryReadUiState({
    serverSucceeded: result.source === 'server',
    serverDocCount: result.serverDocCount,
    fallbackDocCount: result.fallbackDocCount,
  })
  if (ui === 'server-empty-no-week') return 'no-week'
  if (ui === 'error') return 'error-state'
  if (ui === 'cache-fallback-data') return { showData: true, stale: true }
  return { showData: true, stale: false }
}

test('server fails + empty fallback maps to error state not no-week', () => {
  assert.equal(
    resolvePreferringQueryReadUiState({
      serverSucceeded: false,
      serverDocCount: 0,
      fallbackDocCount: 0,
    }),
    'error'
  )
  assert.equal(
    mapPreferringResultToDashboardState({
      source: 'cache-fallback',
      serverDocCount: 0,
      fallbackDocCount: 0,
    }),
    'error-state'
  )
})

test('server fails + cached docs maps to data with stale flag', () => {
  assert.equal(
    resolvePreferringQueryReadUiState({
      serverSucceeded: false,
      serverDocCount: 0,
      fallbackDocCount: 3,
    }),
    'cache-fallback-data'
  )
  assert.deepEqual(
    mapPreferringResultToDashboardState({
      source: 'cache-fallback',
      serverDocCount: 0,
      fallbackDocCount: 3,
    }),
    { showData: true, stale: true }
  )
})

test('server succeeds empty maps to no-week only', () => {
  assert.equal(
    resolvePreferringQueryReadUiState({
      serverSucceeded: true,
      serverDocCount: 0,
      fallbackDocCount: 0,
    }),
    'server-empty-no-week'
  )
  assert.equal(
    mapPreferringResultToDashboardState({
      source: 'server',
      serverDocCount: 0,
      fallbackDocCount: 0,
    }),
    'no-week'
  )
})

test('picks read uses server first when server responds', () => {
  function loadPicksReadOrder(serverOk, cacheFallbackUsed) {
    const steps = []
    steps.push('getDocFromServer')
    if (!serverOk) {
      steps.push('getDoc-cache-fallback')
    }
    return { steps, servedFromCache: cacheFallbackUsed && !serverOk }
  }
  const serverPath = loadPicksReadOrder(true, false)
  assert.deepEqual(serverPath.steps, ['getDocFromServer'])
  assert.equal(serverPath.servedFromCache, false)

  const cachePath = loadPicksReadOrder(false, true)
  assert.deepEqual(cachePath.steps, ['getDocFromServer', 'getDoc-cache-fallback'])
  assert.equal(cachePath.servedFromCache, true)
})