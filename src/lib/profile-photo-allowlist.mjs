/**
 * Allowed profile photo hosts (keep in sync with firestore.rules profilePhotoUrlOk).
 */

const HOST_SUFFIXES = [
  'googleusercontent.com',
  'ggpht.com',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'api-sports.io',
]

/**
 * @param {unknown} url
 * @returns {boolean}
 */
export function isAllowedProfilePhotoUrl(url) {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (trimmed.length === 0 || trimmed.length > 2048) return false
  if (!trimmed.startsWith('https://')) return false
  try {
    const host = new URL(trimmed).hostname.toLowerCase()
    return HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    )
  } catch {
    return false
  }
}