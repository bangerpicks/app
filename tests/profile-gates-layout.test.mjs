import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('profile gates layout wiring', () => {
  const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8')
  const provider = readFileSync(new URL('../src/lib/UserProfileProvider.tsx', import.meta.url), 'utf8')

  it('mounts ProfileGates inside IntlProvider', () => {
    const gatesIdx = layout.indexOf('<ProfileGates')
    const intlOpenIdx = layout.indexOf('<IntlProvider>')
    const intlCloseIdx = layout.indexOf('</IntlProvider>')
    assert.ok(gatesIdx >= 0)
    assert.ok(intlOpenIdx >= 0 && intlCloseIdx > intlOpenIdx)
    assert.ok(gatesIdx > intlOpenIdx && gatesIdx < intlCloseIdx)
  })

  it('keeps ProfileGates inside ErrorBoundary', () => {
    const gatesIdx = layout.indexOf('<ProfileGates')
    const boundaryOpen = layout.indexOf('<ErrorBoundary>')
    const boundaryClose = layout.indexOf('</ErrorBoundary>')
    assert.ok(gatesIdx > boundaryOpen && gatesIdx < boundaryClose)
  })

  it('does not render UsernameRequiredGate from UserProfileProvider', () => {
    assert.doesNotMatch(provider, /<UsernameRequiredGate/)
  })
})