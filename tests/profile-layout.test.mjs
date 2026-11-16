import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('ProfileClient narrow viewport layout', () => {
  const source = readFileSync(
    new URL('../src/components/dashboard/ProfileClient.tsx', import.meta.url),
    'utf8'
  )

  it('allows vertical scroll so trophy case and version line are reachable on small screens', () => {
    assert.match(source, /overflow-y-auto/)
    assert.match(source, /min-h-0/)
    assert.match(source, /data-testid="profile-trophy-case"/)
    assert.match(source, /data-testid="profile-version-line"/)
  })
})