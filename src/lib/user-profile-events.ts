/** Fired on window after Firestore profile display name is saved (Username gate or onboarding). */
export const PROFILE_DISPLAY_NAME_SAVED_EVENT = 'banger-picks:profile-display-name-saved'

/** Fired when Welcome onboarding is completed and Firestore has hasSeenOnboardingIntro. */
export const PROFILE_ONBOARDING_SEEN_EVENT = 'banger-picks:profile-onboarding-seen'

export function dispatchProfileDisplayNameSaved(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROFILE_DISPLAY_NAME_SAVED_EVENT))
}

export function dispatchProfileOnboardingSeen(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROFILE_ONBOARDING_SEEN_EVENT))
}