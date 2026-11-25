import test from 'node:test'
import assert from 'node:assert/strict'
import { isGameweekWindowOpen } from '../src/save-gameweek-picks-plan.ts'

test('leave branching: open window when active before lock', () => {
  const now = 1_000_000
  const lockAt = now + 60_000
  assert.equal(
    isGameweekWindowOpen(
      { status: 'active', lockAtMs: lockAt, forceOpenForTesting: false },
      now
    ),
    true
  )
})

test('leave branching: locked after deadline', () => {
  const now = 2_000_000
  const lockAt = 1_000_000
  assert.equal(
    isGameweekWindowOpen(
      { status: 'active', lockAtMs: lockAt, forceOpenForTesting: false },
      now
    ),
    false
  )
})