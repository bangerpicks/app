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
