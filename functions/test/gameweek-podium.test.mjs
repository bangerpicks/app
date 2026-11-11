import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyPodiumAwardInTransaction,
  buildWeeklyPointsByUid,
  rankPodiumFromWeeklyPoints,
} from '../lib/gameweek-podium.js'

test('buildWeeklyPointsByUid and rankPodiumFromWeeklyPoints', () => {
  const map = buildWeeklyPointsByUid([
    [{ uid: 'a', awarded: true, points: 3 }],
    [{ uid: 'b', awarded: true, points: 6 }, { uid: 'a', awarded: true, points: 2 }],
  ])
  const podium = rankPodiumFromWeeklyPoints(map)
  assert.equal(podium[0].uid, 'b')
  assert.equal(podium[0].rank, 1)
  assert.equal(podium[1].uid, 'a')
  assert.equal(podium[1].rank, 2)
})

test('applyPodiumAwardInTransaction is no-op when podiumAwardedAt already set (retry / duplicate)', async () => {
  const updates = []
  const gameweekRef = { firestore: { collection: () => ({ doc: () => ({}) }) } }

  const tx = {
    async get() {
      return {
        exists: true,
        data: () => ({ podiumAwardedAt: { seconds: 1700000000 } }),
      }
    },
    update(ref, data) {
      updates.push({ ref, data })
    },
  }

  const outcome = await applyPodiumAwardInTransaction(tx, gameweekRef, 'gw-1', [
    { uid: 'user-1', rank: 1, weeklyPoints: 10 },
  ])

  assert.equal(outcome, 'skipped-already-awarded')
  assert.equal(updates.length, 0)
})

test('applyPodiumAwardInTransaction writes users and claim flag in one txn on first delivery', async () => {
  const updates = []
  const gameweekRefMarker = { kind: 'gameweek' }
  const gameweekRef = Object.assign(gameweekRefMarker, {
    firestore: {
      collection(name) {
        assert.equal(name, 'users')
        return {
          doc(uid) {
            return { kind: 'user', uid }
          },
        }
      },
    },
  })

  const tx = {
    async get() {
      return { exists: true, data: () => ({ status: 'completed' }) }
    },
    update(ref, data) {
      updates.push({ ref, keys: Object.keys(data) })
    },
  }

  const outcome = await applyPodiumAwardInTransaction(tx, gameweekRef, 'gw-1', [
    { uid: 'user-1', rank: 1, weeklyPoints: 10 },
    { uid: 'user-2', rank: 2, weeklyPoints: 8 },
  ])

  assert.equal(outcome, 'awarded')
  assert.equal(updates.length, 3)
  const gameweekUpdate = updates.find((u) => u.ref === gameweekRefMarker)
  assert.ok(gameweekUpdate)
  assert.ok(gameweekUpdate.keys.includes('podiumAwardedAt'))
})

test('second concurrent delivery after first award only skips', async () => {
  let awarded = false

  const makeTx = () => ({
    async get() {
      return {
        exists: true,
        data: () => (awarded ? { podiumAwardedAt: { seconds: 1 } } : {}),
      }
    },
    update() {
      awarded = true
    },
  })

  const gameweekRef = {
    firestore: {
      collection: () => ({ doc: () => ({}) }),
    },
  }

  const podium = [{ uid: 'u1', rank: 1, weeklyPoints: 5 }]
  const first = await applyPodiumAwardInTransaction(makeTx(), gameweekRef, 'gw-x', podium)
  const second = await applyPodiumAwardInTransaction(makeTx(), gameweekRef, 'gw-x', podium)

  assert.equal(first, 'awarded')
  assert.equal(second, 'skipped-already-awarded')
})
