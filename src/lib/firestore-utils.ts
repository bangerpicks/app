/**
 * Utility functions for Firestore operations with timeout and retry support
 */

export const FIRESTORE_READ_TIMEOUT_MS = 15_000
export const FIRESTORE_FIXTURES_READ_TIMEOUT_MS = 22_000
export const FIRESTORE_READ_MAX_RETRIES = 3
export const FIRESTORE_READ_RETRY_BASE_MS = 1_000

/**
 * Wraps a promise with a timeout. The underlying promise is not cancelled when
 * the timeout fires (Firestore has no cancel), but the caller can proceed with retry.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = FIRESTORE_READ_TIMEOUT_MS,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle)
    }
  }
}

export function isNonRetryableFirestoreError(error: unknown): boolean {
  const code = (error as { code?: string })?.code
  return code === 'permission-denied' || code === 'not-found'
}

/**
 * Retries an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = FIRESTORE_READ_MAX_RETRIES,
  baseDelayMs: number = FIRESTORE_READ_RETRY_BASE_MS
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (isNonRetryableFirestoreError(error)) {
        throw error
      }

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

/**
 * Firestore read with per-attempt timeout and exponential backoff retries.
 */
export async function readWithTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  options?: {
    timeoutMs?: number
    timeoutMessage?: string
    maxRetries?: number
    baseDelayMs?: number
  }
): Promise<T> {
  const {
    timeoutMs = FIRESTORE_READ_TIMEOUT_MS,
    timeoutMessage = 'Operation timed out',
    maxRetries = FIRESTORE_READ_MAX_RETRIES,
    baseDelayMs = FIRESTORE_READ_RETRY_BASE_MS,
  } = options ?? {}

  return withRetry(
    () => withTimeout(operation(), timeoutMs, timeoutMessage),
    maxRetries,
    baseDelayMs
  )
}