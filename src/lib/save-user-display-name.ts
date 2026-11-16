import { updateProfile, type User } from 'firebase/auth'
import { ensureUserDocument, isDisplayNameAvailable } from './users'
import { withRetry, withTimeout } from './firestore-utils'
import { isMissingProfileDisplayName, isDisplayNameFormatValid } from './display-name'

export const DISPLAY_NAME_SAVE_TIMEOUT_MS = 15_000
export const DISPLAY_NAME_SAVE_MAX_RETRIES = 1
export const DISPLAY_NAME_SAVE_RETRY_BASE_MS = 1_000

export type SaveUserDisplayNameResult =
  | { ok: true }
  | { ok: false; code: 'validation' | 'reserved' | 'taken' | 'timeout' | 'firestore' }

/**
 * Validates, writes Firestore profile first (timeout + retry), then Auth (best-effort).
 */
export async function saveUserDisplayName(
  user: User,
  displayName: string,
  options?: { referralCode?: string | null; skipAvailabilityCheck?: boolean }
): Promise<SaveUserDisplayNameResult> {
  const trimmed = displayName.trim()

  if (!trimmed) {
    return { ok: false, code: 'validation' }
  }
  if (!isDisplayNameFormatValid(trimmed)) {
    return { ok: false, code: 'validation' }
  }
  if (isMissingProfileDisplayName(trimmed)) {
    return { ok: false, code: 'reserved' }
  }

  if (!options?.skipAvailabilityCheck) {
    const isAvailable = await isDisplayNameAvailable(trimmed, user.uid)
    if (!isAvailable) {
      return { ok: false, code: 'taken' }
    }
  }

  try {
    await withRetry(
      () =>
        withTimeout(
          ensureUserDocument(user, trimmed, options?.referralCode ?? undefined),
          DISPLAY_NAME_SAVE_TIMEOUT_MS,
          'display-name-firestore-timeout'
        ),
      DISPLAY_NAME_SAVE_MAX_RETRIES,
      DISPLAY_NAME_SAVE_RETRY_BASE_MS
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('timeout') || message === 'display-name-firestore-timeout') {
      return { ok: false, code: 'timeout' }
    }
    return { ok: false, code: 'firestore' }
  }

  try {
    await updateProfile(user, { displayName: trimmed })
  } catch (error) {
    console.warn('Auth displayName update failed (non-fatal):', error)
  }

  return { ok: true }
}