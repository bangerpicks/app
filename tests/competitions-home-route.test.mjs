import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('my-games route renders the home client, not a self-redirect', () => {
  const home = readFileSync(join(root, 'src/app/my-games/page.tsx'), 'utf8')
  assert.match(home, /DashboardClient/)
  assert.doesNotMatch(home, /LegacyCompetitionsRedirectPage/)
  assert.doesNotMatch(home, /router\.replace\(MY_GAMES_HOME_PATH\)/)

  const legacyCompetitions = readFileSync(join(root, 'src/app/competitions/page.tsx'), 'utf8')
  assert.match(legacyCompetitions, /LegacyCompetitionsRedirectPage/)

  const legacyDashboard = readFileSync(join(root, 'src/app/dashboard/page.tsx'), 'utf8')
  assert.match(legacyDashboard, /LegacyDashboardRedirectPage/)
})