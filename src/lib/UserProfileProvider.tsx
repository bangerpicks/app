'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './AuthProvider'
import type { UserDocument } from '@/lib/users'

type UserProfileContextValue = {
  profile: UserDocument | null
  loading: boolean
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profile: null,
  loading: true,
})

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserDocument | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserDocument) : null)
        setLoading(false)
      },
      () => {
        setProfile(null)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [user, authLoading])

  const value = useMemo(() => ({ profile, loading }), [profile, loading])

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
}

export function useUserProfile() {
  return useContext(UserProfileContext)
}