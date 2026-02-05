/**
 * Hook to check if current user is an admin
 */

'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from './AuthProvider'
import { db } from './firebase'

interface UseIsAdminResult {
  isAdmin: boolean
  loading: boolean
}

/**
 * Check if the current user is an admin
 * Checks both settings/app.adminUids array and users/{uid}.isAdmin field
 */
export function useIsAdmin(): UseIsAdminResult {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAdminStatus() {
      if (authLoading) {
        return
      }

      if (!user) {
        console.log('[Admin Check] No user found')
        setIsAdmin(false)
        setLoading(false)
        return
      }

      console.log('[Admin Check] Checking admin status for user:', user.uid)

      try {
        // Check users/{uid}.isAdmin field first
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          console.log('[Admin Check] User document data:', userData)
          if (userData.isAdmin === true) {
            console.log('[Admin Check] ✓ User is admin via isAdmin field')
            setIsAdmin(true)
            setLoading(false)
            return
          }
        } else {
          console.log('[Admin Check] User document does not exist')
        }

        // Check settings/app.adminUids array
        const settingsDoc = await getDoc(doc(db, 'settings', 'app'))
        if (settingsDoc.exists()) {
          const settingsData = settingsDoc.data()
          const adminUids = settingsData.adminUids || []
          console.log('[Admin Check] Settings adminUids array:', adminUids)
          console.log('[Admin Check] User UID:', user.uid)
          console.log('[Admin Check] Array type:', Array.isArray(adminUids))
          console.log('[Admin Check] UIDs in array:', adminUids.map((uid: string) => `"${uid}"`))
          console.log('[Admin Check] Is user UID in array?', adminUids.includes(user.uid))
          
          // Also check with trimmed UIDs in case there are whitespace issues
          const trimmedUids = adminUids.map((uid: string) => String(uid).trim())
          const trimmedUserUid = user.uid.trim()
          const matchesTrimmed = trimmedUids.includes(trimmedUserUid)
          console.log('[Admin Check] After trimming - Is user UID in array?', matchesTrimmed)
          
          if (Array.isArray(adminUids) && (adminUids.includes(user.uid) || matchesTrimmed)) {
            console.log('[Admin Check] ✓ User is admin via adminUids array')
            setIsAdmin(true)
            setLoading(false)
            return
          }
        } else {
          console.log('[Admin Check] Settings document does not exist')
        }

        console.log('[Admin Check] ✗ User is NOT an admin')
        setIsAdmin(false)
      } catch (error) {
        console.error('[Admin Check] Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user, authLoading])

  return { isAdmin, loading: loading || authLoading }
}
