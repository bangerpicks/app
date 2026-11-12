import test from 'node:test'
import assert from 'node:assert/strict'

// Keep in sync with src/lib/match-card-display.ts
function resolveWhyItMatters(whyItMatters, whyItMatters_esMX, locale) {
  const es = whyItMatters_esMX?.trim()
  if (locale === 'es-MX' && es) return es
  const en = whyItMatters?.trim()
  return en || undefined
}

test('resolveWhyItMatters prefers Spanish when locale is es-MX', () => {
  assert.equal(
    resolveWhyItMatters('English line', 'Línea en español', 'es-MX'),
    'Línea en español'
  )
})

test('resolveWhyItMatters falls back to English when Spanish missing', () => {
  assert.equal(resolveWhyItMatters('English line', '', 'es-MX'), 'English line')
  assert.equal(resolveWhyItMatters('English line', undefined, 'es-MX'), 'English line')
})

test('resolveWhyItMatters uses English for en locale even if Spanish present', () => {
  assert.equal(
    resolveWhyItMatters('English line', 'Línea en español', 'en'),
    'English line'
  )
})

// Keep in sync with src/lib/match-card-display.ts
function mapApiFootballStatusToMatchStatus(apiStatus) {
  if (apiStatus === 'NS' || apiStatus === 'TBD') {
    return 'TBP'
  }
  if (apiStatus === 'HT') {
    return 'HT'
  }
  if (
    apiStatus === '1H' ||
    apiStatus === '2H' ||
    apiStatus === 'ET' ||
    apiStatus === 'P'
  ) {
    return 'LIVE'
  }
  return apiStatus
}

test('mapApiFootballStatusToMatchStatus maps HT to HT', () => {
  assert.equal(mapApiFootballStatusToMatchStatus('HT'), 'HT')
})

test('mapApiFootballStatusToMatchStatus maps in-play to LIVE', () => {
  for (const code of ['1H', '2H', 'ET', 'P']) {
    assert.equal(mapApiFootballStatusToMatchStatus(code), 'LIVE', code)
  }
})

test('mapApiFootballStatusToMatchStatus maps not started to TBP', () => {
  assert.equal(mapApiFootballStatusToMatchStatus('NS'), 'TBP')
  assert.equal(mapApiFootballStatusToMatchStatus('TBD'), 'TBP')
})

test('mapApiFootballStatusToMatchStatus passes through FT', () => {
  assert.equal(mapApiFootballStatusToMatchStatus('FT'), 'FT')
})

function formatMatchVenue(venue) {
  if (!venue) return undefined
  const name = venue.name?.trim()
  const city = venue.city?.trim()
  if (name && city) return `${name}, ${city}`
  return name || city || undefined
}

test('formatMatchVenue joins name and city', () => {
  assert.equal(
    formatMatchVenue({ name: 'National Stadium', city: 'Singapore' }),
    'National Stadium, Singapore'
  )
})

test('formatMatchVenue handles partial venue', () => {
  assert.equal(formatMatchVenue({ name: 'Wembley', city: '' }), 'Wembley')
  assert.equal(formatMatchVenue({ name: '', city: 'London' }), 'London')
})

function officialPickTranslationKey(pick) {
  const map = { H: 'home', D: 'draw', A: 'away' }
  return map[pick]
}

test('officialPickTranslationKey maps prediction codes', () => {
  assert.equal(officialPickTranslationKey('H'), 'home')
  assert.equal(officialPickTranslationKey('D'), 'draw')
  assert.equal(officialPickTranslationKey('A'), 'away')
})
