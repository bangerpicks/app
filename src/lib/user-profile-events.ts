/** Fired on window after Firestore profile display name is saved (Username gate or onboarding). */
export const PROFILE_DISPLAY_NAME_SAVED_EVENT = 'banger-picks:profile-display-name-saved'

export function dispatchProfileDisplayNameSaved(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROFILE_DISPLAY_NAME_SAVED_EVENT))
}