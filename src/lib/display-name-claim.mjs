/**
 * Display-name claim helpers (unit-tested). Placeholder names are not uniquified.
 */

export const DEFAULT_DISPLAY_NAME = 'Player'

const PLACEHOLDER_NORMALIZED = new Set(['player', 'jugador'])

/**
 * @param {string} displayName
 * @returns {string}
 */
export function normalizeDisplayNameKey(displayName) {
  return String(displayName || '').trim().toLowerCase()
}

/**
 * Names many users share before onboarding — never write displayNames/{key} for these.
 * @param {string} displayName
 * @returns {boolean}
 */
export function isPlaceholderDisplayName(displayName) {
  const key = normalizeDisplayNameKey(displayName)
  return !key || PLACEHOLDER_NORMALIZED.has(key)
}

/**
 * @param {string} normalizedKey
 * @returns {boolean}
 */
export function shouldReserveDisplayNameClaim(normalizedKey) {
  return Boolean(normalizedKey) && !PLACEHOLDER_NORMALIZED.has(normalizedKey)
}

/**
 * Whether onboarding should force picking a real display name.
 * @param {string | null | undefined} authDisplayName
 * @param {string | null | undefined} profileDisplayName
 * @returns {boolean}
 */
export function needsCustomDisplayNamePrompt(authDisplayName, profileDisplayName) {
  const auth = String(authDisplayName || '').trim()
  const profile = String(profileDisplayName || '').trim()
  const resolved = profile || auth
  if (!resolved) return true
  return isPlaceholderDisplayName(resolved)
}