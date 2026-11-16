/**
 * When to show Welcome onboarding or the username gate (unit-tested).
 */

import { isMissingProfileDisplayName } from './display-name.mjs'

/** @typedef {'loading' | 'loaded' | 'error'} ProfileLoadStatus */

/**
 * @param {{
 *   status: ProfileLoadStatus
 *   hasSeenOnboardingIntro: boolean | undefined
 *   localOnboardingSeen: boolean
 * }} input
 * @returns {boolean}
 */
export function shouldShowWelcomeIntro(input) {
  if (input.localOnboardingSeen) return false
  if (input.status !== 'loaded') return false
  return input.hasSeenOnboardingIntro !== true
}

/**
 * @param {{
 *   status: ProfileLoadStatus
 *   displayName: string | null | undefined
 *   localValidDisplayName: boolean
 * }} input
 * @returns {boolean}
 */
export function shouldShowUsernameNameGate(input) {
  if (input.localValidDisplayName) return false
  if (input.status !== 'loaded') return false
  return isMissingProfileDisplayName(input.displayName)
}