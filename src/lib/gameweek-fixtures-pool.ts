import { collection, onSnapshot, query, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { GameweekFixtureData } from './admin'

type PoolEntry = {
  data: GameweekFixtureData[]
  listeners: Set<(data: GameweekFixtureData[]) => void>
  unsubscribe?: Unsubscribe
  refCount: number
}

const pools = new Map<string, PoolEntry>()

function ensurePool(gameweekId: string): PoolEntry {
  let pool = pools.get(gameweekId)
  if (pool) return pool

  pool = { data: [], listeners: new Set(), refCount: 0 }
  pools.set(gameweekId, pool)

  const fixturesRef = collection(db, 'gameweeks', gameweekId, 'fixtures')
  pool.unsubscribe = onSnapshot(
    query(fixturesRef),
    (snapshot) => {
      const next: GameweekFixtureData[] = []
      snapshot.forEach((d) => next.push(d.data() as GameweekFixtureData))
      pool!.data = next
      pool!.listeners.forEach((l) => l(next))
    },
    (error) => {
      console.error(`[fixtures-pool] ${gameweekId}`, error)
    }
  )
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
      pool.unsubscribe?.()
      pools.delete(gameweekId)
    }
  }
}