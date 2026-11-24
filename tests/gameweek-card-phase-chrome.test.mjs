import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveGameweekCardPhaseChrome } from '../src/lib/gameweek-card-phase-chrome.mjs'

describe('gameweek card phase chrome', () => {
  it('OPEN uses lime header and border', () => {
    const c = resolveGameweekCardPhaseChrome('OPEN', 'normal')
    assert.match(c.headerShell, /lime-yellow/)
    assert.match(c.bodyBorder, /lime-yellow/)
    assert.equal(c.headerAnimation, 'gameweek-card-header-glow')
  })

  it('CLOSING_SOON warning uses amber', () => {
    const c = resolveGameweekCardPhaseChrome('CLOSING_SOON', 'warning')
    assert.match(c.headerShell, /amber-glow/)
    assert.match(c.bodyBorder, /amber-glow/)
  })

  it('CLOSING_SOON critical uses cinnabar', () => {
    const c = resolveGameweekCardPhaseChrome('CLOSING_SOON', 'critical')
    assert.match(c.headerShell, /cinnabar/)
    assert.match(c.bodyBorder, /cinnabar/)
  })

  it('LIVE uses cinnabar chrome', () => {
    const c = resolveGameweekCardPhaseChrome('LIVE', 'normal')
    assert.match(c.headerShell, /cinnabar/)
    assert.match(c.usersIcon, /cinnabar/)
  })

  it('COMPLETED matches status pill gray chrome', () => {
    const c = resolveGameweekCardPhaseChrome('COMPLETED', 'normal')
    assert.match(c.headerShell, /bg-gray-500\/20/)
    assert.match(c.headerShell, /text-gray-400/)
    assert.match(c.bodyBorder, /border-gray-500\/30/)
    assert.match(c.usersIcon, /text-gray-400/)
    assert.match(c.metaRow, /bg-gray-500\/20/)
    assert.match(c.playersCount, /text-gray-300/)
  })
})