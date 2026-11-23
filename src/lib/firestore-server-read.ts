/**
 * Server-first Firestore reads for dashboard gameweek / fixtures loading.
 */

import {
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  type DocumentReference,
  type DocumentSnapshot,
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

export type PreferringReadSource = 'server' | 'cache-fallback'

export type ServerPreferringReadResult<T> = {
  data: T
  source: PreferringReadSource
  servedFromCache: boolean
  error?: Error
}

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

/**
 * Pure classification for unit tests and dashboard UX (keep in sync with tests).
 */
export type PreferringQueryReadUiState =
  | 'error'
  | 'server-data'
  | 'server-empty-no-week'
  | 'cache-fallback-data'

export function resolvePreferringQueryReadUiState(params: {
  serverSucceeded: boolean
  serverDocCount: number
  fallbackDocCount: number
}): PreferringQueryReadUiState {
  if (params.serverSucceeded) {
    return params.serverDocCount === 0 ? 'server-empty-no-week' : 'server-data'
  }
  if (params.fallbackDocCount > 0) {
    return 'cache-fallback-data'
  }
  return 'error'
}

function rejectUnexpectedCacheOnlyServerSnapshot(
  snapshot: Pick<QuerySnapshot, 'metadata'>,
  timeoutMessage: string
): void {
  if (snapshot.metadata.fromCache) {
    throw new FirestoreServedFromCacheError(timeoutMessage)
  }
}

async function readQueryFromServer(
  queryRef: Query,
  timeoutMs: number,
  timeoutMessage: string
): Promise<QuerySnapshot> {
  const snapshot = await withTimeout(
    getDocsFromServer(queryRef),
    timeoutMs,
    timeoutMessage
  )
  rejectUnexpectedCacheOnlyServerSnapshot(snapshot, timeoutMessage)
  return snapshot
}

async function readQueryFromCacheFallback(
  queryRef: Query,
  timeoutMs: number,
  timeoutMessage: string
): Promise<QuerySnapshot> {
  const snapshot = await withTimeout(getDocs(queryRef), timeoutMs, timeoutMessage)
  if (snapshot.empty) {
    throw new FirestoreServedFromCacheError(timeoutMessage)
  }
  return snapshot
}

function toQueryReadResult(
  snapshot: QuerySnapshot,
  source: PreferringReadSource
): ServerPreferringReadResult<QuerySnapshot> {
  return {
    data: snapshot,
    source,
    servedFromCache: source === 'cache-fallback',
  }
}

/**
 * Prefer a server read with timeout + retries within a shared load budget.
 * On server failure: non-empty cache fallback returns data with servedFromCache true;
 * empty fallback always throws.
 */
export async function getQuerySnapshotServerPreferring(
  queryRef: Query,
  options: {
    budget: LoadBudget
    timeoutMessage: string
    maxRetries?: number
    /** Render IndexedDB cache immediately, then refresh from server in the retry loop. */
    staleWhileRevalidate?: boolean
  }
): Promise<ServerPreferringReadResult<QuerySnapshot>> {
  const maxRetries = options.maxRetries ?? FIRESTORE_SERVER_READ_MAX_RETRIES
  let lastError: Error | undefined

  if (options.staleWhileRevalidate) {
    try {
      const cached = await getDocsFromCache(queryRef)
      if (!cached.empty) {
        return toQueryReadResult(cached, 'cache-fallback')
      }
    } catch {
      // No cache yet — continue to server path.
    }
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    options.budget.assertRemaining()
    const timeoutMs = Math.max(
      750,
      Math.min(FIRESTORE_SERVER_READ_ATTEMPT_MS, options.budget.remaining())
    )

    try {
      const snapshot = await readQueryFromServer(queryRef, timeoutMs, options.timeoutMessage)
      return toQueryReadResult(snapshot, 'server')
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
        const snapshot = await readQueryFromCacheFallback(
          queryRef,
          cacheProbeMs,
          options.timeoutMessage
        )
        return toQueryReadResult(snapshot, 'cache-fallback')
      } catch (fallbackError: unknown) {
        if (fallbackError instanceof FirestoreServedFromCacheError) {
          throw fallbackError
        }
        lastError =
          fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
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

async function readDocFromServer(
  docRef: DocumentReference,
  timeoutMs: number,
  timeoutMessage: string
): Promise<DocumentSnapshot> {
  const snapshot = await withTimeout(getDocFromServer(docRef), timeoutMs, timeoutMessage)
  if (snapshot.metadata.fromCache) {
    throw new FirestoreServedFromCacheError(timeoutMessage)
  }
  return snapshot
}

async function readDocFromCacheFallback(
  docRef: DocumentReference,
  timeoutMs: number,
  timeoutMessage: string
): Promise<DocumentSnapshot> {
  const snapshot = await withTimeout(getDoc(docRef), timeoutMs, timeoutMessage)
  if (!snapshot.exists()) {
    throw new FirestoreServedFromCacheError(timeoutMessage)
  }
  return snapshot
}

/**
 * Server-first single-doc read (predictions cache). Missing doc on server is not an error.
 */
export async function getDocServerPreferring(
  docRef: DocumentReference,
  options: {
    timeoutMs: number
    timeoutMessage: string
  }
): Promise<ServerPreferringReadResult<DocumentSnapshot>> {
  try {
    const snapshot = await readDocFromServer(docRef, options.timeoutMs, options.timeoutMessage)
    return {
      data: snapshot,
      source: 'server',
      servedFromCache: false,
    }
  } catch (error: unknown) {
    if (isNonRetryableFirestoreError(error) || error instanceof FirestoreServedFromCacheError) {
      throw error
    }
    try {
      const snapshot = await readDocFromCacheFallback(
        docRef,
        Math.min(2_000, options.timeoutMs),
        options.timeoutMessage
      )
      return {
        data: snapshot,
        source: 'cache-fallback',
        servedFromCache: true,
      }
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : error
    }
  }
}

export function markServedFromCacheRef(
  ref: { current: boolean } | undefined,
  result: Pick<ServerPreferringReadResult<unknown>, 'servedFromCache'>
): void {
  if (ref && result.servedFromCache) {
    ref.current = true
  }
}

function toDocReadResult(
  snapshot: DocumentSnapshot,
  source: PreferringReadSource
): ServerPreferringReadResult<DocumentSnapshot> {
  return {
    data: snapshot,
    source,
    servedFromCache: source === 'cache-fallback',
  }
}

/**
 * Prefer a server single-doc read with timeout + retries within a shared load budget.
 * A missing document on the server is a successful empty read, not an error.
 */
export async function getDocSnapshotServerPreferring(
  docRef: DocumentReference,
  options: {
    budget: LoadBudget
    timeoutMessage: string
    maxRetries?: number
  }
): Promise<ServerPreferringReadResult<DocumentSnapshot>> {
  const maxRetries = options.maxRetries ?? FIRESTORE_SERVER_READ_MAX_RETRIES
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    options.budget.assertRemaining()
    const timeoutMs = Math.max(
      750,
      Math.min(FIRESTORE_SERVER_READ_ATTEMPT_MS, options.budget.remaining())
    )

    try {
      const snapshot = await readDocFromServer(docRef, timeoutMs, options.timeoutMessage)
      return toDocReadResult(snapshot, 'server')
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (
        error instanceof FirestoreServedFromCacheError ||
        isNonRetryableFirestoreError(error)
      ) {
        throw error
      }

      try {
        const cacheProbeMs = Math.max(500, Math.min(2_000, options.budget.remaining()))
        const snapshot = await readDocFromCacheFallback(docRef, cacheProbeMs, options.timeoutMessage)
        return toDocReadResult(snapshot, 'cache-fallback')
      } catch (fallbackError: unknown) {
        if (fallbackError instanceof FirestoreServedFromCacheError) {
          throw fallbackError
        }
        lastError =
          fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
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