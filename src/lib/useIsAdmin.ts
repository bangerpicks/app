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
        setIsAdmin(false)
        setLoading(false)
        return
      }

      try {
        // Check users/{uid}.isAdmin field first
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.isAdmin === true) {
            setIsAdmin(true)
            setLoading(false)
            return
          }
        }

        // Check settings/app.adminUids array
        const settingsDoc = await getDoc(doc(db, 'settings', 'app'))
        if (settingsDoc.exists()) {
          const settingsData = settingsDoc.data()
          const adminUids = settingsData.adminUids || []
          if (Array.isArray(adminUids) && adminUids.includes(user.uid)) {
            setIsAdmin(true)
            setLoading(false)
            return
          }
        }

        setIsAdmin(false)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user, authLoading])

  return { isAdmin, loading: loading || authLoading }
}
