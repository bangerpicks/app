/**
 * Firestore validUserCreate requires displayNameOk: length 2–30 (rules).
 * Phone/email auth may yield empty, whitespace, or 1-char displayName — use signup placeholder.
 */

const SIGNUP_PLACEHOLDER = 'Player'

/**
 * @param {string | null | undefined} authDisplayName
 * @returns {string}
 */
export function displayNameForUserCreate(authDisplayName) {
  const trimmed = (authDisplayName ?? '').trim()
  if (trimmed.length >= 2 && trimmed.length <= 30) {
    return trimmed
  }
  return SIGNUP_PLACEHOLDER
}