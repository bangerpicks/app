/**
 * @param {unknown} url
 * @returns {string | null}
 */
export function normalizeProfilePhotoUrl(url) {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  return trimmed.length > 0 ? trimmed : null
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