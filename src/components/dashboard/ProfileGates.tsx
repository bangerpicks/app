'use client'

import { useAuth } from '@/lib/AuthProvider'
import { useUserProfile } from '@/lib/UserProfileProvider'
import { UsernameRequiredGate } from './UsernameRequiredGate'

/**
 * Profile overlays that require next-intl. Mount inside IntlProvider (see RootLayout).
 */
export function ProfileGates() {
  const { user } = useAuth()
  const { showUsernameNameGate } = useUserProfile()

  if (!showUsernameNameGate || !user) {
    return null
  }

  return <UsernameRequiredGate user={user} />
}