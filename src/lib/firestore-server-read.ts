/**
 * Server-first Firestore reads for dashboard gameweek / fixtures loading.
 */

import {
  getDocs,
  getDocsFromServer,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore'
import {
  withTimeout,
  isNonRetryableFirestoreError,
  FIRESTORE_READ_RETRY_BASE_MS,
} from './firestore-utils'

export const DASHBOARD_LOAD_BUDGET_MS = 32_000
export const FIRESTORE_SERVER_READ_ATTEMPT_MS = 8_000
export const FIRESTORE_SERVER_READ_MAX_RETRIES = 2

export class LoadBudget {
  private readonly deadline: number

  constructor(totalMs: number = DASHBOARD_LOAD_BUDGET_MS) {
    this.deadline = Date.now() + totalMs
  }

  remaining(): number {
    return Math.max(0, this.deadline - Date.now())
  }

  assertRemaining(): void {
    if (this.remaining() <= 0) {
      throw new Error('Dashboard load timed out')
    }
  }
}

export class FirestoreServedFromCacheError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FirestoreServedFromCacheError'
  }
}

export function rejectIfCacheOnlySnapshot(
  snapshot: Pick<QuerySnapshot, 'metadata' | 'empty'>,
  timeoutMessage: string
): void {
  if (snapshot.metadata.fromCache) {
    throw new FirestoreServedFromCacheError(timeoutMessage)
  }
}

async function readSnapshotFromServer(
  queryRef: Query,
  timeoutMs: number,
  timeoutMessage: string
): Promise<QuerySnapshot> {
  const snapshot = await withTimeout(
    getDocsFromServer(queryRef),
    timeoutMs,
    timeoutMessage
  )
  rejectIfCacheOnlySnapshot(snapshot, timeoutMessage)
  return snapshot
}

async function probeCacheOnlyFailure(
  queryRef: Query,
  timeoutMs: number,
  timeoutMessage: string
): Promise<QuerySnapshot> {
  const cached = await withTimeout(getDocs(queryRef), timeoutMs, timeoutMessage)
  rejectIfCacheOnlySnapshot(cached, timeoutMessage)
  return cached
}

export type ServerPreferringReadResult = {
  snapshot: QuerySnapshot
  servedFromCache: boolean
}

/**
 * Prefer a server read with timeout + retries within a shared load budget.
 * Cache reads are used only to detect offline/cache-only failure (then throw).
 */
export async function getQuerySnapshotServerPreferring(
  queryRef: Query,
  options: {
    budget: LoadBudget
    timeoutMessage: string
    maxRetries?: number
  }
): Promise<ServerPreferringReadResult> {
  const maxRetries = options.maxRetries ?? FIRESTORE_SERVER_READ_MAX_RETRIES
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    options.budget.assertRemaining()
    const timeoutMs = Math.max(
      750,
      Math.min(FIRESTORE_SERVER_READ_ATTEMPT_MS, options.budget.remaining())
    )

    try {
      const snapshot = await readSnapshotFromServer(
        queryRef,
        timeoutMs,
        options.timeoutMessage
      )
      return { snapshot, servedFromCache: false }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (
        error instanceof FirestoreServedFromCacheError ||
        isNonRetryableFirestoreError(error)
      ) {
        throw error
      }

      try {
        const cacheProbeMs = Math.max(
          500,
          Math.min(2_000, options.budget.remaining())
        )
        const snapshot = await probeCacheOnlyFailure(
          queryRef,
          cacheProbeMs,
          options.timeoutMessage
        )
        return { snapshot, servedFromCache: false }
      } catch (probeError: unknown) {
        if (probeError instanceof FirestoreServedFromCacheError) {
          throw probeError
        }
        lastError =
          probeError instanceof Error ? probeError : new Error(String(probeError))
      }

      if (attempt < maxRetries && options.budget.remaining() > 0) {
        const delay = Math.min(
          FIRESTORE_READ_RETRY_BASE_MS * Math.pow(2, attempt),
          options.budget.remaining()
        )
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
  }

  throw lastError ?? new Error(options.timeoutMessage)
}