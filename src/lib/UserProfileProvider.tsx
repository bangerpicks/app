'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import {
  PROFILE_DISPLAY_NAME_SAVED_EVENT,
  PROFILE_ONBOARDING_SEEN_EVENT,
} from './user-profile-events'
import {
  readLocalOnboardingSeen,
  readLocalValidDisplayName,
  writeLocalOnboardingSeen,
  writeLocalValidDisplayName,
} from './profile-device-flags'
import {
  shouldShowUsernameNameGate,
  shouldShowWelcomeIntro as computeShouldShowWelcomeIntro,
} from './profile-gate-policy.mjs'
import { snapshotFromUserDocData } from './own-profile-snapshot.mjs'

export type ProfileLoadStatus = 'loading' | 'loaded' | 'error'

export type OwnUserProfile = {
  displayName: string
  hasSeenOnboardingIntro: boolean
  photoURL: string | null
  points: number
  totalPredictions: number
  correctPredictions: number
  accuracy: number
  favoriteTeam: UserDocumentFavorite | null
  favoritePlayer: UserDocumentFavoritePlayer | null
  referralPoints: number
  pointsSpent: number
  weekWins1st: number
  weekWins2nd: number
  weekWins3rd: number
  seasonTitles: number
  seasonPodiums: number
}

type UserDocumentFavorite = {
  id: number
  name: string
  logo: string
} | null

type UserDocumentFavoritePlayer = {
  id: number
  name: string
  photo: string
} | null

interface UserProfileContextValue {
  profileStatus: ProfileLoadStatus
  ownProfile: OwnUserProfile | null
  profileDisplayName: string | null
  profileLoading: boolean
  hasValidProfileName: boolean
  hasSeenOnboardingIntro: boolean | undefined
  shouldShowWelcomeIntro: boolean
  refreshProfile: (options?: { background?: boolean }) => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined)

const PROFILE_ERROR_RETRY_MS = 20_000

function shouldShowUsernameGate(pathname: string | null): boolean {
  if (!pathname) return true
  const normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  if (normalized.startsWith('/auth')) return false
  return true
}

function toOwnProfile(raw: Record<string, unknown> | null): OwnUserProfile | null {
  if (!raw) return null
  return raw as unknown as OwnUserProfile
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const [profileStatus, setProfileStatus] = useState<ProfileLoadStatus>('loading')
  const [ownProfile, setOwnProfile] = useState<OwnUserProfile | null>(null)
  const [localOnboardingSeen, setLocalOnboardingSeen] = useState(false)
  const [localValidDisplayName, setLocalValidDisplayName] = useState(false)
  const uidRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user?.uid) {
      uidRef.current = null
      setProfileStatus('loading')
      setOwnProfile(null)
      setLocalOnboardingSeen(false)
      setLocalValidDisplayName(false)
      return
    }
    uidRef.current = user.uid
    const storage = typeof window !== 'undefined' ? window.localStorage : null
    setLocalOnboardingSeen(readLocalOnboardingSeen(storage, user.uid))
    setLocalValidDisplayName(readLocalValidDisplayName(storage, user.uid))
    setProfileStatus('loading')
    setOwnProfile(null)
  }, [user?.uid])

  const syncLocalFlagsFromProfile = useCallback(
    (uid: string, profile: OwnUserProfile) => {
      const storage = typeof window !== 'undefined' ? window.localStorage : null
      if (profile.hasSeenOnboardingIntro) {
        writeLocalOnboardingSeen(storage, uid)
        setLocalOnboardingSeen(true)
      }
      if (!isMissingProfileDisplayName(profile.displayName)) {
        writeLocalValidDisplayName(storage, uid)
        setLocalValidDisplayName(true)
      }
    },
    []
  )

  const refreshProfile = useCallback(
    async (options?: { background?: boolean }) => {
      const uid = user?.uid
      if (!uid) {
        setProfileStatus('loading')
        setOwnProfile(null)
        return
      }
      if (!options?.background) {
        setProfileStatus((prev) => (prev === 'loaded' ? 'loaded' : 'loading'))
      }
      try {
        const userRef = doc(db, 'users', uid)
        const snap = await readWithTimeoutAndRetry(() => getDoc(userRef), {
          timeoutMessage: 'Failed to load user profile',
        })
        const snapshot = snap.exists()
          ? toOwnProfile(snapshotFromUserDocData(snap.data()) as Record<string, unknown>)
          : toOwnProfile(
              snapshotFromUserDocData({
                displayName: '',
                hasSeenOnboardingIntro: false,
              }) as Record<string, unknown>
            )
        if (!snapshot) {
          setProfileStatus('error')
          return
        }
        setOwnProfile(snapshot)
        setProfileStatus('loaded')
        syncLocalFlagsFromProfile(uid, snapshot)
      } catch (error) {
        console.error('Error loading user profile:', error)
        setProfileStatus('error')
      }
    },
    [user?.uid, syncLocalFlagsFromProfile]
  )

  useEffect(() => {
    if (authLoading) return
    void refreshProfile()
  }, [authLoading, refreshProfile])

  useEffect(() => {
    if (profileStatus !== 'error' || !user?.uid) return
    const id = window.setInterval(() => {
      void refreshProfile({ background: true })
    }, PROFILE_ERROR_RETRY_MS)
    return () => window.clearInterval(id)
  }, [profileStatus, user?.uid, refreshProfile])

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.uid) return
    const storage = window.localStorage
    const uid = user.uid

    const onNameSaved = () => {
      writeLocalValidDisplayName(storage, uid)
      setLocalValidDisplayName(true)
      void refreshProfile({ background: true })
    }
    const onOnboardingSeen = () => {
      writeLocalOnboardingSeen(storage, uid)
      setLocalOnboardingSeen(true)
      void refreshProfile({ background: true })
    }

    window.addEventListener(PROFILE_DISPLAY_NAME_SAVED_EVENT, onNameSaved)
    window.addEventListener(PROFILE_ONBOARDING_SEEN_EVENT, onOnboardingSeen)
    return () => {
      window.removeEventListener(PROFILE_DISPLAY_NAME_SAVED_EVENT, onNameSaved)
      window.removeEventListener(PROFILE_ONBOARDING_SEEN_EVENT, onOnboardingSeen)
    }
  }, [user?.uid, refreshProfile])

  const displayName = ownProfile?.displayName ?? null
  const hasSeenOnboardingIntro = ownProfile?.hasSeenOnboardingIntro

  const hasValidProfileName = Boolean(
    localValidDisplayName ||
      (profileStatus === 'loaded' && displayName != null && !isMissingProfileDisplayName(displayName))
  )

  const shouldShowWelcomeIntro = computeShouldShowWelcomeIntro({
    status: profileStatus,
    hasSeenOnboardingIntro,
    localOnboardingSeen,
  })

  const showNameGate =
    Boolean(user) &&
    !authLoading &&
    shouldShowUsernameNameGate({
      status: profileStatus,
      displayName,
      localValidDisplayName,
    }) &&
    shouldShowUsernameGate(pathname)

  const value = useMemo(
    () => ({
      profileStatus,
      ownProfile,
      profileDisplayName: hasValidProfileName && displayName ? displayName.trim() : null,
      profileLoading: authLoading || profileStatus === 'loading',
      hasValidProfileName,
      hasSeenOnboardingIntro,
      shouldShowWelcomeIntro,
      refreshProfile,
    }),
    [
      profileStatus,
      ownProfile,
      displayName,
      authLoading,
      hasValidProfileName,
      hasSeenOnboardingIntro,
      shouldShowWelcomeIntro,
      refreshProfile,
    ]
  )

  return (
    <UserProfileContext.Provider value={value}>
      {children}
      {showNameGate && user ? <UsernameRequiredGate user={user} /> : null}
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