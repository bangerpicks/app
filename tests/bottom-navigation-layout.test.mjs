import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bottomNavSource = readFileSync(
  join(root, 'src/components/dashboard/BottomNavigation.tsx'),
  'utf8'
)
const globalsCss = readFileSync(join(root, 'src/app/globals.css'), 'utf8')

test('bottom navigation is viewport-fixed, not sticky', () => {
  assert.match(bottomNavSource, /data-bottom-nav/)
  assert.match(bottomNavSource, /\bfixed\b/)
  assert.match(bottomNavSource, /\bbottom-0\b/)
  assert.doesNotMatch(bottomNavSource, /\bsticky\b/)
})

test('globals CSS does not apply sticky-nav GPU hack to bottom tab bar', () => {
  assert.match(globalsCss, /nav\[data-bottom-nav\]/)
  assert.doesNotMatch(
    globalsCss,
    /nav\[class\*="sticky"\]/
  )
})