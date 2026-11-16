'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from './AuthProvider'
import { db } from './firebase'
import { isMissingProfileDisplayName } from './display-name'
import { readWithTimeoutAndRetry } from './firestore-utils'
import { UsernameRequiredGate } from '@/components/dashboard/UsernameRequiredGate'
import { PROFILE_DISPLAY_NAME_SAVED_EVENT } from './user-profile-events'

interface UserProfileContextValue {
  profileDisplayName: string | null
  profileLoading: boolean
  hasValidProfileName: boolean
  refreshProfile: () => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined)

function shouldShowUsernameGate(pathname: string | null): boolean {
  if (!pathname) return true
  const normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  if (normalized.startsWith('/auth')) return false
  return true
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const refreshProfile = useCallback(async () => {
    if (!user?.uid) {
      setProfileDisplayName(null)
      return
    }
    setProfileLoading(true)
    try {
      const userRef = doc(db, 'users', user.uid)
      const snap = await readWithTimeoutAndRetry(() => getDoc(userRef), {
        timeoutMessage: 'Failed to load user profile',
      })
      if (snap.exists()) {
        const data = snap.data()
        setProfileDisplayName(typeof data.displayName === 'string' ? data.displayName : '')
      } else {
        setProfileDisplayName('')
      }
    } catch (error) {
      console.error('Error loading user profile for display name:', error)
      setProfileDisplayName('')
    } finally {
      setProfileLoading(false)
    }
  }, [user?.uid])

  useEffect(() => {
    if (authLoading) return
    void refreshProfile()
  }, [authLoading, refreshProfile])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onSaved = () => {
      void refreshProfile()
    }
    window.addEventListener(PROFILE_DISPLAY_NAME_SAVED_EVENT, onSaved)
    return () => window.removeEventListener(PROFILE_DISPLAY_NAME_SAVED_EVENT, onSaved)
  }, [refreshProfile])

  const hasValidProfileName = Boolean(
    user && !profileLoading && profileDisplayName != null && !isMissingProfileDisplayName(profileDisplayName)
  )

  const showGate =
    Boolean(user) &&
    !authLoading &&
    !profileLoading &&
    profileDisplayName != null &&
    isMissingProfileDisplayName(profileDisplayName) &&
    shouldShowUsernameGate(pathname)

  const value = useMemo(
    () => ({
      profileDisplayName,
      profileLoading: authLoading || profileLoading,
      hasValidProfileName,
      refreshProfile,
    }),
    [profileDisplayName, authLoading, profileLoading, hasValidProfileName, refreshProfile]
  )

  return (
    <UserProfileContext.Provider value={value}>
      {children}
      {showGate && user ? <UsernameRequiredGate user={user} /> : null}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext)
  if (ctx === undefined) {
    throw new Error('useUserProfile must be used within UserProfileProvider')
  }
  return ctx
}