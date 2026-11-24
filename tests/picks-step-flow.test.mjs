import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  resolveActiveStepIndex,
  resolveInitialFixtureId,
  resolveNextFixtureId,
} from '../src/lib/picks-step-flow.mjs'

const matches = [
  { fixtureId: 101 },
  { fixtureId: 102 },
  { fixtureId: 103 },
]

describe('picks-step-flow', () => {
  it('resolveInitialFixtureId picks first without a prediction', () => {
    const id = resolveInitialFixtureId(matches, () => null)
    assert.equal(id, 101)
  })

  it('resolveInitialFixtureId skips to first missing pick', () => {
    const id = resolveInitialFixtureId(matches, (fid) => (fid === 101 ? 'H' : null))
    assert.equal(id, 102)
  })

  it('resolveInitialFixtureId falls back to first when all picked', () => {
    const id = resolveInitialFixtureId(matches, () => 'D')
    assert.equal(id, 101)
  })

  it('resolveNextFixtureId advances to next unpicked', () => {
    const pred = new Map([
      [101, 'H'],
      [102, null],
      [103, null],
    ])
    const get = (fid) => pred.get(fid) ?? null
    const next = resolveNextFixtureId(matches, get, 101)
    assert.equal(next, 102)
  })

  it('resolveNextFixtureId wraps when later fixtures are unpicked', () => {
    const get = (fid) => (fid === 103 ? null : 'H')
    const next = resolveNextFixtureId(matches, get, 102)
    assert.equal(next, 103)
  })

  it('resolveNextFixtureId stays on current when slate is complete', () => {
    const next = resolveNextFixtureId(matches, () => 'A', 102)
    assert.equal(next, 102)
  })

  it('resolveActiveStepIndex is one-based', () => {
    assert.equal(resolveActiveStepIndex(matches, 102), 2)
    assert.equal(resolveActiveStepIndex(matches, 999), 1)
  })
})