/**
 * Pure helpers for ensureUserDocument write skipping (unit-tested).
 */

import { isPlaceholderDisplayName } from './display-name-claim.mjs'

/**
 * @param {Record<string, unknown> | null | undefined} currentData
 * @param {string} displayName
 * @param {string | null | undefined} photoURL
 * @param {{ allowRename?: boolean } | undefined} options
 * @returns {boolean}
 */
export function shouldSkipEnsureUserProfileWrite(currentData, displayName, photoURL, options) {
  if (!currentData || typeof currentData !== 'object') {
    return false
  }
  const currentName = currentData.displayName || 'Player'
  const resolvedName = displayName || currentName || 'Player'
  const renameWouldApply =
    options?.allowRename === false
      ? false
      : !(
          isPlaceholderDisplayName(resolvedName) &&
          currentName &&
          !isPlaceholderDisplayName(currentName)
        ) && currentName !== resolvedName
  const sameName = !renameWouldApply
  const samePhoto = (currentData.photoURL ?? null) === (photoURL ?? null)
  const hasReferral = Boolean(currentData.referralCode)
  return sameName && samePhoto && hasReferral
}

/**
 * Whether an existing profile may receive a displayName update from ensureUserDocument.
 *
 * @param {string} currentName
 * @param {string} nextName
 * @param {{ allowRename?: boolean } | undefined} options
 * @returns {boolean}
 */
export function shouldApplyEnsureUserDisplayNameUpdate(currentName, nextName, options) {
  if (options?.allowRename === false) {
    return false
  }
  const resolved = nextName || currentName || 'Player'
  if (
    isPlaceholderDisplayName(resolved) &&
    currentName &&
    !isPlaceholderDisplayName(currentName)
  ) {
    return false
  }
  return (currentName || 'Player') !== resolved
}