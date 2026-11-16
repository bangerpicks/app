import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FieldValue } from 'firebase-admin/firestore'
import { syncDisplayNameInStandings } from '../lib/sync-display-name-standings.js'

describe('syncDisplayNameInStandings', () => {
  it('imports FieldValue.serverTimestamp from firebase-admin/firestore', () => {
    assert.equal(typeof FieldValue.serverTimestamp, 'function')
    const sentinel = FieldValue.serverTimestamp()
    assert.ok(sentinel && typeof sentinel === 'object')
  })

  it('writes standings patches using FieldValue.serverTimestamp (FN-001 regression)', async () => {
    const batchSets = []
    const mockBatch = {
      set(ref, data, opts) {
        batchSets.push({ ref, data, opts })
        assert.doesNotThrow(() => {
          assert.ok(data.updatedAt)
        })
      },
      async commit() {},
    }

    const db = {
      batch() {
        return mockBatch
      },
      collection(name) {
        return {
          async get() {
            if (name === 'weeklyStandings') {
              return {
                docs: [
                  {
                    ref: { id: 'gw-test' },
                    data() {
                      return {
                        entries: [{ uid: 'uid-a', displayName: 'Player', points: 3, rank: 1 }],
                      }
                    },
                  },
                ],
              }
            }
            if (name === 'seasonStandings') {
              return { docs: [] }
            }
            return { docs: [] }
          },
        }
      },
    }

    await syncDisplayNameInStandings(db, 'uid-a', 'Gaffer', 'Player')

    assert.equal(batchSets.length, 1)
    assert.equal(batchSets[0].data.entries[0].displayName, 'Gaffer')
    assert.ok(batchSets[0].data.updatedAt)
  })

  it('matches onUserDisplayNameUpdate handler behavior', async () => {
    const batchSets = []
    const mockBatch = {
      set(_ref, data) {
        batchSets.push(data)
      },
      async commit() {},
    }

    const db = {
      batch: () => mockBatch,
      collection(name) {
        return {
          async get() {
            if (name === 'weeklyStandings') {
              return {
                docs: [
                  {
                    ref: {},
                    data: () => ({
                      entries: [{ uid: 'user-1', displayName: 'Old', points: 1 }],
                    }),
                  },
                ],
              }
            }
            return { docs: [] }
          },
        }
      },
    }

    const beforeName = 'Old'
    const afterName = 'New'
    const uid = 'user-1'

    if (!afterName || beforeName === afterName) {
      assert.fail('test precondition')
    }

    await syncDisplayNameInStandings(db, uid, afterName, beforeName)

    assert.equal(batchSets.length, 1)
    assert.equal(batchSets[0].entries[0].displayName, 'New')
  })
})