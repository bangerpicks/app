import test from 'node:test'
import assert from 'node:assert/strict'
import { finalizePendingLeavesForGameweek } from '../src/leave-league-finalize.ts'

function createMockDb(docs) {
  return {
    collectionGroup() {
      return {
        where(field, _op, value) {
          return {
            limit() {
              return {
                async get() {
                  const filtered = docs.filter((d) => d.data.pendingLeaveGameweekId === value)
                  return {
                    empty: filtered.length === 0,
                    docs: filtered,
                  }
                },
              }
            },
          }
        },
      }
    },
    collection(name) {
      if (name === 'users') {
        return {
          doc(uid) {
            return {
              collection(sub) {
                if (sub === 'homeMembership') {
                  return { doc: () => ({ id: 'summary' }) }
                }
                return { doc: (id) => ({ id }) }
              },
            }
          },
        }
      }
      if (name === 'competitions') {
        return { doc: (id) => ({ id }) }
      }
      return { doc: () => ({}) }
    },
    batch() {
      const ops = []
      return {
        delete(ref) {
          ops.push(['delete', ref.id])
        },
        set(ref) {
          ops.push(['set', ref.id ?? ref])
        },
        async commit() {
          this.committed = ops
        },
        committed: null,
      }
    },
  }
}

test('finalizePendingLeavesForGameweek returns 0 when none pending', async () => {
  const db = createMockDb([])
  const n = await finalizePendingLeavesForGameweek(db, 'gw-x')
  assert.equal(n, 0)
})