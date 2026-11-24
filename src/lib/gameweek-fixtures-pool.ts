import { collection, onSnapshot, query, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { GameweekFixtureData } from './admin'

type PoolEntry = {
  data: GameweekFixtureData[]
  listeners: Set<(data: GameweekFixtureData[]) => void>
  unsubscribe?: Unsubscribe
  retryTimer?: ReturnType<typeof setTimeout>
  failures: number
  refCount: number
}

const pools = new Map<string, PoolEntry>()

const RETRY_BASE_MS = 2_000
const RETRY_MAX_MS = 60_000

function attachPoolListener(gameweekId: string, pool: PoolEntry): void {
  const fixturesRef = collection(db, 'gameweeks', gameweekId, 'fixtures')
  pool.unsubscribe = onSnapshot(
    query(fixturesRef),
    (snapshot) => {
      pool.failures = 0
      const next: GameweekFixtureData[] = []
      snapshot.forEach((d) => next.push(d.data() as GameweekFixtureData))
      pool.data = next
      pool.listeners.forEach((l) => l(next))
    },
    (error) => {
      // A Firestore listener is dead after an error; re-attach with backoff while still in use.
      console.error(`[fixtures-pool] ${gameweekId}`, error)
      pool.unsubscribe?.()
      pool.unsubscribe = undefined
      if (pools.get(gameweekId) !== pool) return
      const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * Math.pow(2, pool.failures++))
      pool.retryTimer = setTimeout(() => {
        pool.retryTimer = undefined
        if (pools.get(gameweekId) === pool && pool.listeners.size > 0) {
          attachPoolListener(gameweekId, pool)
        }
      }, delay)
    }
  )
}

function ensurePool(gameweekId: string): PoolEntry {
  let pool = pools.get(gameweekId)
  if (pool) return pool

  pool = { data: [], listeners: new Set(), refCount: 0, failures: 0 }
  pools.set(gameweekId, pool)
  attachPoolListener(gameweekId, pool)
  return pool
}

/** One Firestore listener per gameweekId, shared across Home/picks/cards. */
export function subscribeGameweekFixturesPool(
  gameweekId: string,
  listener: (fixtures: GameweekFixtureData[]) => void
): () => void {
  const pool = ensurePool(gameweekId)
  pool.refCount++
  pool.listeners.add(listener)
  listener(pool.data)

  return () => {
    pool.listeners.delete(listener)
    pool.refCount--
    if (pool.refCount <= 0 && pool.listeners.size === 0) {
      if (pool.retryTimer) clearTimeout(pool.retryTimer)
      pool.unsubscribe?.()
      pools.delete(gameweekId)
    }
  }
}