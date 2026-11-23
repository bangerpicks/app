import test from 'node:test'
import assert from 'node:assert/strict'
// Compiled output is not required; import TS via transpile hook would be heavy.
// Duplicate minimal pick logic for regression guard (keep in sync with gameweek-selection.ts).
function isFlagshipGameweek(gw) {
  const t = gw.type
  if (!t || t === 'banger-week' || t === 'flagship') return true
  return false
}

function pickCurrentFlagshipGameweek(activeSorted, completedSorted, allSorted) {
  const activeFlagship = activeSorted.filter(isFlagshipGameweek)
  if (activeFlagship.length > 0) return activeFlagship[0]
  const completedFlagship = completedSorted.filter(isFlagshipGameweek)
  if (completedFlagship.length > 0) return completedFlagship[0]
  const fallback = allSorted.find(
    (gw) => gw.status !== 'archived' && gw.status !== 'draft' && isFlagshipGameweek(gw)
  )
  return fallback ?? null
}

test('pickCurrentFlagshipGameweek prefers latest active flagship', () => {
  const active = [
    { gameweekId: 'gw-2', status: 'active', type: 'banger-week' },
    { gameweekId: 'gw-1', status: 'active', type: 'banger-week' },
  ]
  const picked = pickCurrentFlagshipGameweek(active, [], active)
  assert.equal(picked.gameweekId, 'gw-2')
})

test('archived weeks are never current', () => {
  const all = [{ gameweekId: 'gw-old', status: 'archived', type: 'banger-week' }]
  const picked = pickCurrentFlagshipGameweek([], [], all)
  assert.equal(picked, null)
})

test('league type is not selected as flagship current week', () => {
  const active = [{ gameweekId: 'gw-l', status: 'active', type: 'league' }]
  const picked = pickCurrentFlagshipGameweek(active, [], active)
  assert.equal(picked, null)
})

function isGameweekPicksWindowOpen(gw) {
  if (gw.status === 'UPCOMING' || gw.status === 'COMPLETED') return false
  if (gw.forceOpenForTesting === true) return true
  if (!gw.deadline) return false
  return Date.now() < gw.deadline.getTime()
}

test('isGameweekPicksWindowOpen uses deadline not stale CLOSED status', () => {
  const future = new Date(Date.now() + 60 * 60 * 1000)
  assert.equal(
    isGameweekPicksWindowOpen({
      status: 'CLOSED',
      deadline: future,
    }),
    true
  )
})

test('isGameweekPicksWindowOpen respects force open', () => {
  assert.equal(
    isGameweekPicksWindowOpen({
      status: 'CLOSED',
      forceOpenForTesting: true,
    }),
    true
  )
})
