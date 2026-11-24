import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('GameweekCard dashboard CTAs', () => {
  const source = readFileSync(
    new URL('../src/components/dashboard/GameweekCard.tsx', import.meta.url),
    'utf8'
  )

  it('links to picks and dedicated gw rankings when split', () => {
    assert.match(source, /gameweek-card-cta-split/)
    assert.match(source, /GameweekCardCTAs/)
    assert.match(source, /\/picks\/\?id=/)
    assert.match(source, /\/rankings\/gw\/\?id=/)
    assert.match(source, /showSplit = hasAnyPicks && phase !== 'UPCOMING'/)
    assert.match(source, /viewTable/)
  })
})