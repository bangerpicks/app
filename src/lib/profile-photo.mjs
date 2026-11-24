import { isAllowedProfilePhotoUrl } from './profile-photo-allowlist.mjs'

/**
 * @param {unknown} url
 * @returns {string | null}
 */
export function normalizeProfilePhotoUrl(url) {
  if (!isAllowedProfilePhotoUrl(url)) return null
  return String(url).trim()
}

/**
 * First non-empty photo URL wins (favorite player, Firestore, auth).
 * @param {...unknown} candidates
 * @returns {string | null}
 */
export function coalesceProfilePhotoUrl(...candidates) {
  for (const c of candidates) {
    const n = normalizeProfilePhotoUrl(c)
    if (n) return n
  }
  return null
}