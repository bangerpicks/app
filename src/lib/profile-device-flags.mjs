/**
 * Device-side profile flags (localStorage, keyed by uid). Firestore remains SSOT;
 * flags are set when Firestore confirms and allow skipping gate/welcome while offline.
 */

const PREFIX = 'banger-picks:profile:'
const ONBOARDING_SUFFIX = ':onboarding-seen'
const VALID_NAME_SUFFIX = ':valid-display-name'

/**
 * @param {string} uid
 * @returns {string}
 */
export function onboardingSeenStorageKey(uid) {
  return `${PREFIX}${uid}${ONBOARDING_SUFFIX}`
}

/**
 * @param {string} uid
 * @returns {string}
 */
export function validDisplayNameStorageKey(uid) {
  return `${PREFIX}${uid}${VALID_NAME_SUFFIX}`
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} key
 * @returns {boolean}
 */
export function readProfileFlag(storage, key) {
  if (!storage) return false
  try {
    return storage.getItem(key) === '1'
  } catch {
    return false
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} key
 */
export function writeProfileFlag(storage, key) {
  if (!storage) return
  try {
    storage.setItem(key, '1')
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} uid
 * @returns {boolean}
 */
export function readLocalOnboardingSeen(storage, uid) {
  if (!uid) return false
  return readProfileFlag(storage, onboardingSeenStorageKey(uid))
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} uid
 * @returns {boolean}
 */
export function readLocalValidDisplayName(storage, uid) {
  if (!uid) return false
  return readProfileFlag(storage, validDisplayNameStorageKey(uid))
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} uid
 */
export function writeLocalOnboardingSeen(storage, uid) {
  if (!uid) return
  writeProfileFlag(storage, onboardingSeenStorageKey(uid))
}

/**
 * @param {Storage | null | undefined} storage
 * @param {string} uid
 */
export function writeLocalValidDisplayName(storage, uid) {
  if (!uid) return
  writeProfileFlag(storage, validDisplayNameStorageKey(uid))
}