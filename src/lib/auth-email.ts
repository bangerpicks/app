import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

export const EMAIL_FOR_SIGN_IN_KEY = 'banger-picks:emailForSignIn'

export type AuthEmailErrorCode =
  | 'invalidEmail'
  | 'wrongPassword'
  | 'userNotFound'
  | 'emailAlreadyInUse'
  | 'weakPassword'
  | 'tooManyRequests'
  | 'generic'

export function mapFirebaseAuthError(code: string | undefined): AuthEmailErrorCode {
  switch (code) {
    case 'auth/invalid-email':
      return 'invalidEmail'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'wrongPassword'
    case 'auth/user-not-found':
      return 'userNotFound'
    case 'auth/email-already-in-use':
      return 'emailAlreadyInUse'
    case 'auth/weak-password':
      return 'weakPassword'
    case 'auth/too-many-requests':
      return 'tooManyRequests'
    default:
      return 'generic'
  }
}

export function getEmailContinueUrl(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/auth/continue/`
}

export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
  return cred.user
}

export async function signUpWithEmailPassword(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
  if (!cred.user.emailVerified) {
    await sendEmailVerification(cred.user)
  }
  return cred.user
}

export async function sendPasswordResetEmailTo(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim())
}

export async function sendEmailSignInLink(email: string): Promise<void> {
  const actionCodeSettings = {
    url: getEmailContinueUrl(),
    handleCodeInApp: true,
  }
  await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings)
  localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email.trim())
}

export function isEmailSignInLink(link: string): boolean {
  return isSignInWithEmailLink(auth, link)
}

export async function completeEmailLinkSignIn(email: string, link: string): Promise<User> {
  const cred = await signInWithEmailLink(auth, email.trim(), link)
  localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY)
  return cred.user
}

export function readStoredEmailForSignIn(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY)
}

export async function resendVerificationEmail(user: User): Promise<void> {
  if (!user.emailVerified) {
    await sendEmailVerification(user)
  }
}
