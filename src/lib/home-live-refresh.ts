/**
 * Live listener: rebuild Home when catalog/homePlay changes on the server.
 */

import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import { HOME_LIVE_CHANGE_DEBOUNCE_MS } from './home-revalidate.mjs'
import { HOME_PLAY_CATALOG_PATH } from './home-catalog-client'

const RETRY_BASE_MS = 2_000
const RETRY_MAX_MS = 60_000

/**
 * Subscribe to catalog changes. `onChange` fires (debounced) only after the first
 * server-confirmed state, when signature changes.
 */
export function subscribeHomeCatalogChanges(onChange: () => void): () => void {
  let stopped = false
  let baseline: string | null = null
  let fromCache = true
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const evaluate = (signature: string | undefined) => {
    if (stopped || signature === undefined) return
    const next = signature
    if (fromCache) {
      baseline = next
      return
    }
    if (baseline === null) {
      baseline = next
      return
    }
    if (next !== baseline) {
      baseline = next
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (!stopped) onChange()
      }, HOME_LIVE_CHANGE_DEBOUNCE_MS)
    }
  }

  const ref = doc(db, 'catalog', 'homePlay')
  let unsub: Unsubscribe | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let failures = 0

  const start = () => {
    if (stopped) return
    unsub = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        failures = 0
        fromCache = snap.metadata.fromCache
        const sig = snap.exists() ? String(snap.data()?.signature ?? '') : ''
        evaluate(sig)
      },
      (error) => {
        console.warn('[home-live] homePlay listener error; retrying', error)
        unsub?.()
        unsub = undefined
        const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * Math.pow(2, failures++))
        retryTimer = setTimeout(start, delay)
      }
    )
  }
  start()

  return () => {
    stopped = true
    if (debounceTimer) clearTimeout(debounceTimer)
    if (retryTimer) clearTimeout(retryTimer)
    unsub?.()
  }
}