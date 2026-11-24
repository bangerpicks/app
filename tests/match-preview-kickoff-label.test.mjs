import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// Mirror formatMatchPreviewKickoffOrWeekday threshold + weekday branch
const MS_PER_DAY = 24 * 60 * 60 * 1000

function formatMatchPreviewKickoffOrWeekday(date, locale, now) {
  if (date.getTime() - now.getTime() > MS_PER_DAY) {
    return new Intl.DateTimeFormat(locale === 'es-MX' ? 'es-MX' : 'en-US', {
      weekday: 'short',
    }).format(date)
  }
  return new Intl.DateTimeFormat(locale === 'es-MX' ? 'es-MX' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

describe('match preview kickoff label', () => {
  it('uses short weekday when kickoff is more than 24h away', () => {
    const now = new Date('2026-11-24T12:00:00')
    const kickoff = new Date('2026-11-26T15:00:00')
    const label = formatMatchPreviewKickoffOrWeekday(kickoff, 'en', now)
    assert.match(label, /^Thu/)
  })

  it('uses kickoff time when within 24h', () => {
    const now = new Date('2026-11-24T12:00:00')
    const kickoff = new Date('2026-11-25T11:45:00')
    const label = formatMatchPreviewKickoffOrWeekday(kickoff, 'en', now)
    assert.match(label, /\d/)
    assert.doesNotMatch(label, /^Mon|^Tue|^Wed|^Thu|^Fri|^Sat|^Sun/)
  })
})