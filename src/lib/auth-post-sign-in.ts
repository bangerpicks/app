import type { User } from 'firebase/auth'
import { ensureUserDocument } from './users'
import { trackReferralSignup } from './referrals'

export interface CompleteSignInResult {
  isNewUser: boolean
  referralMessage: string | null
}

export async function completeSignInAfterAuth(
  user: User,
  options?: { referralCode?: string | null }
): Promise<CompleteSignInResult> {
  const referralCode = options?.referralCode ?? null
  const displayName = user.displayName || 'Player'
  const { isNewUser } = await ensureUserDocument(user, displayName, referralCode || undefined)

  let referralMessage: string | null = null
  if (referralCode) {
    try {
      await trackReferralSignup(user.uid, referralCode)
      referralMessage = 'Referral applied! Your friend earned 5 points.'
    } catch (refError) {
      console.error('Error processing referral:', refError)
      referralMessage = 'Referral could not be applied. Contact support if needed.'
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('referralCode')
    }
  }

  return { isNewUser, referralMessage }
}
