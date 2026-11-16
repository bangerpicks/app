/**
 * Profile display name rules (unit-tested). Keep in sync with src/lib/display-name.ts.
 */

export const PLACEHOLDER_DISPLAY_NAMES = ['player', 'jugador']

/**
 * @param {string | null | undefined} name
 * @returns {boolean}
 */
export function isReservedDisplayName(name) {
  if (name == null) return true
  const trimmed = String(name).trim()
  if (trimmed.length === 0) return true
  return PLACEHOLDER_DISPLAY_NAMES.includes(trimmed.toLowerCase())
}

/**
 * @param {string | null | undefined} name
 * @returns {boolean}
 */
export function isMissingProfileDisplayName(name) {
  return isReservedDisplayName(name)
}

/**
 * @param {string | null | undefined} authDisplayName
 * @returns {string}
 */
export function suggestedDisplayNameFromAuth(authDisplayName) {
  if (isMissingProfileDisplayName(authDisplayName)) {
    return ''
  }
  return String(authDisplayName).trim()
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isDisplayNameFormatValid(name) {
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 30) return false
  return /^[a-zA-Z0-9\s\-_]+$/.test(trimmed)
}