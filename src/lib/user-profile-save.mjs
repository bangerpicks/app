/**
 * Pure helpers for ensureUserDocument write skipping (unit-tested).
 */

/**
 * @param {Record<string, unknown> | null | undefined} currentData
 * @param {string} displayName
 * @param {string | null | undefined} photoURL
 * @returns {boolean}
 */
export function shouldSkipEnsureUserProfileWrite(currentData, displayName, photoURL) {
  if (!currentData || typeof currentData !== 'object') {
    return false
  }
  const resolvedName = displayName || currentData.displayName || 'Player'
  const currentName = currentData.displayName || 'Player'
  const sameName = currentName === resolvedName
  const samePhoto = (currentData.photoURL ?? null) === (photoURL ?? null)
  const hasReferral = Boolean(currentData.referralCode)
  return sameName && samePhoto && hasReferral
}