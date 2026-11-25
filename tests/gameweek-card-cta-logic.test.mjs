import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  shouldShowGameweekTableCta,
  shouldShowPersonalGameweekCta,
  personalGameweekCtaMessageKey,
  gameweekCardNoteOverrideKey,
} from '../src/lib/gameweek-card-cta-logic.mjs'

describe('gameweek card CTA visibility', () => {
  it('table when open week has joiners or user picks', () => {
    assert.equal(shouldShowGameweekTableCta('OPEN', false, 4), true)
    assert.equal(shouldShowGameweekTableCta('PICKS_LOCKED', false, 4), true)
    assert.equal(shouldShowGameweekTableCta('PICKS_LOCKED', false, 0), false)
    assert.equal(shouldShowGameweekTableCta('UPCOMING', false, 9), false)
  })

  it('personal CTA while open; after lock only if user has picks', () => {
    assert.equal(shouldShowPersonalGameweekCta('OPEN', false), true)
    assert.equal(shouldShowPersonalGameweekCta('PICKS_LOCKED', false), false)
    assert.equal(shouldShowPersonalGameweekCta('PICKS_LOCKED', true), true)
    assert.equal(shouldShowPersonalGameweekCta('LIVE', false), false)
    assert.equal(shouldShowPersonalGameweekCta('FINAL', true), true)
    assert.equal(shouldShowPersonalGameweekCta('FINAL', false), false)
  })

  it('personal CTA message keys', () => {
    assert.equal(personalGameweekCtaMessageKey('OPEN', false), 'makePicks')
    assert.equal(personalGameweekCtaMessageKey('CLOSING_SOON', true), 'editMyPicks')
    assert.equal(personalGameweekCtaMessageKey('PICKS_LOCKED', true), 'myPicks')
    assert.equal(personalGameweekCtaMessageKey('COMPLETED', true), 'myResults')
  })

  it('footer override when locked and user did not join', () => {
    assert.equal(gameweekCardNoteOverrideKey('PICKS_LOCKED', false, 4), 'gameweekNotePicksLockedLeaderboard')
    assert.equal(gameweekCardNoteOverrideKey('LIVE', false, 2), 'gameweekNotePicksLockedLeaderboard')
    assert.equal(gameweekCardNoteOverrideKey('PICKS_LOCKED', false, 0), null)
    assert.equal(gameweekCardNoteOverrideKey('PICKS_LOCKED', true, 4), null)
  })
})