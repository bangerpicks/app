import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const firebaseJson = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'))

function headerRules() {
  return firebaseJson.hosting?.headers ?? []
}

test('firebase hosting long-caches hashed static assets', () => {
  const assetRule = headerRules().find((r) =>
    r.source?.includes('@(js|css')
  )
  assert.ok(assetRule, 'expected static asset header rule')
  const cache = assetRule.headers.find((h) => h.key === 'Cache-Control')
  assert.match(cache.value, /immutable/)
  assert.match(cache.value, /max-age=31536000/)
})

test('firebase hosting revalidates HTML and app shell', () => {
  // Catch-all before immutable assets so extensionless routes (/dashboard/, /profile/)
  // revalidate; last matching rule wins per key on Firebase Hosting.
  const htmlRule = headerRules().find((r) => r.source === '**')
  assert.ok(htmlRule, 'expected catch-all header rule for HTML/extensionless routes')
  const htmlCache = htmlRule.headers.find((h) => h.key === 'Cache-Control')
  assert.match(htmlCache.value, /must-revalidate/)
  assert.match(htmlCache.value, /max-age=0|no-cache/)

  const assetIdx = headerRules().findIndex((r) => r.source?.includes('@(js|css'))
  const catchAllIdx = headerRules().findIndex((r) => r.source === '**')
  assert.ok(catchAllIdx >= 0 && assetIdx > catchAllIdx, 'catch-all must precede immutable asset rule')
})
