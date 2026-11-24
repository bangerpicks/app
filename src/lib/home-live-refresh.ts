/**
 * Live listeners that tell Home when the round catalog changed on the server
 * (publish, close-out, activeGameweekId switch). Home then re-runs its server load.
 *
 * Small queries only: public active competitions (same shape as the featured query)
 * and active gameweeks. Counter-only changes (playerCount, memberCount) are ignored.
 */

import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Query,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  HOME_LIVE_CHANGE_DEBOUNCE_MS,
  homeCatalogSignature,
  resolveLiveCatalogChange,
} from './home-revalidate.mjs'

type Row = { id: string; data: Record<string, unknown> }

const RETRY_BASE_MS = 2_000
const RETRY_MAX_MS = 60_000

function rows(snap: QuerySnapshot): Row[] {
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }))
}

/**
 * Subscribe to catalog changes. `onChange` fires (debounced) only after the first
 * server-confirmed state, when a later server snapshot differs.
 * Listeners re-attach with backoff after errors (e.g. network drop, token refresh).
 */
export function subscribeHomeCatalogChanges(onChange: () => void): () => void {
  let stopped = false
  let competitions: Row[] | null = null
  let gameweeks: Row[] | null = null
  let compFromCache = true
  let gwFromCache = true
  let baseline: string | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const evaluate = () => {
    if (stopped || competitions === null || gameweeks === null) return
    const next = homeCatalogSignature(competitions, gameweeks)
    const result = resolveLiveCatalogChange({
      baseline,
      next,
      fromCache: compFromCache || gwFromCache,
    })
    baseline = result.baseline
    if (result.reload) {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!stopped) onChange()
      }, HOME_LIVE_CHANGE_DEBOUNCE_MS)
    }
  }

  const attach = (
    label: string,
    build: () => Query<DocumentData>,
    onRows: (r: Row[], fromCache: boolean) => void
  ): (() => void) => {
    let unsub: Unsubscribe | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let failures = 0

    const start = () => {
      if (stopped) return
      unsub = onSnapshot(
        build(),
        { includeMetadataChanges: true },
        (snap) => {
          failures = 0
          onRows(rows(snap), snap.metadata.fromCache)
          evaluate()
        },
        (error) => {
          console.warn(`[home-live] ${label} listener error; retrying`, error)
          unsub?.()
          unsub = undefined
          const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * Math.pow(2, failures++))
          retryTimer = setTimeout(start, delay)
        }
      )
    }
    start()

    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      unsub?.()
    }
  }

  const stopComp = attach(
    'competitions',
    () =>
      query(
        collection(db, 'competitions'),
        where('visibility', '==', 'public'),
        where('status', '==', 'active'),
        limit(12)
      ),
    (r, fromCache) => {
      competitions = r
      compFromCache = fromCache
    }
  )
  const stopGw = attach(
    'gameweeks',
    () => query(collection(db, 'gameweeks'), where('status', '==', 'active')),
    (r, fromCache) => {
      gameweeks = r
      gwFromCache = fromCache
    }
  )

  return () => {
    stopped = true
    if (debounceTimer) clearTimeout(debounceTimer)
    stopComp()
    stopGw()
  }
}
