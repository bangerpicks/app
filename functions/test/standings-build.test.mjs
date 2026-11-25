import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildWeeklyStandingsEntries } from '../lib/standings-update.js'

function mockDb({ entriesByFixture, users }) {
  return {
    collection(name) {
      if (name === 'users') {
        return {
          doc(uid) {
            return { id: uid }
          },
        }
      }
      if (name !== 'predictions') throw new Error(`unexpected collection ${name}`)
      return {
        doc(fixtureId) {
          return {
            collection(sub) {
              if (sub !== 'entries') throw new Error(`unexpected sub ${sub}`)
              return {
                async get() {
                  const rows = entriesByFixture[String(fixtureId)] ?? []
                  return {
                    docs: rows.map((row) => ({
                      id: row.uid,
                      data: () => row,
                    })),
                  }
                },
              }
            },
          }
        },
      }
    },
    async getAll(...refs) {
      return refs.map((ref) => {
        const uid = ref.id
        const data = users[uid]
        return {
          id: uid,
          data: () => data,
        }
      })
    },
  }
}

describe('buildWeeklyStandingsEntries', () => {
  it('includes every picker at 0 points before any match is scored', async () => {
    const db = mockDb({
      entriesByFixture: {
        101: [
          { uid: 'user-a', pick: 'H', awarded: false, points: 0 },
          { uid: 'user-b', pick: 'A', awarded: false, points: 0 },
        ],
        102: [{ uid: 'user-a', pick: 'D', awarded: false, points: 0 }],
      },
      users: {
        'user-a': { displayName: 'Alpha', createdAt: { toMillis: () => 100 } },
        'user-b': { displayName: 'Beta', createdAt: { toMillis: () => 200 } },
      },
    })

    const entries = await buildWeeklyStandingsEntries(db, 'gw-1', [101, 102], { includePicks: true })
    assert.equal(entries.length, 2)
    const byUid = Object.fromEntries(entries.map((e) => [e.uid, e]))
    assert.equal(byUid['user-a'].points, 0)
    assert.equal(byUid['user-b'].points, 0)
    assert.equal(byUid['user-a'].correct, 0)
    assert.ok(byUid['user-a'].rank >= 1)
    assert.deepEqual(byUid['user-a'].picks['101'], { p: 'H', c: null })
    assert.deepEqual(byUid['user-a'].picks['102'], { p: 'D', c: null })
    assert.deepEqual(byUid['user-b'].picks['101'], { p: 'A', c: null })
  })

  it('still sums awarded points when scoring has started', async () => {
    const db = mockDb({
      entriesByFixture: {
        101: [
          { uid: 'user-a', pick: 'H', awarded: true, points: 3, correct: true },
          { uid: 'user-b', pick: 'A', awarded: true, points: 0, correct: false },
        ],
      },
      users: {
        'user-a': { displayName: 'Alpha', createdAt: { toMillis: () => 100 } },
        'user-b': { displayName: 'Beta', createdAt: { toMillis: () => 200 } },
      },
    })

    const entries = await buildWeeklyStandingsEntries(db, 'gw-1', [101])
    const a = entries.find((e) => e.uid === 'user-a')
    const b = entries.find((e) => e.uid === 'user-b')
    assert.equal(a.points, 3)
    assert.equal(a.correct, 1)
    assert.equal(b.points, 0)
    assert.equal(a.rank, 1)
  })
})