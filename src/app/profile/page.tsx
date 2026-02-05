'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { ProfileClient } from '@/components/dashboard/ProfileClient'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { UserDocument } from '@/lib/users'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Mock user data (in production, fetch from Firebase)
const mockUserData: Partial<UserDocument> = {
  displayName: 'Player',
  photoURL: null,
  points: 500,
  totalPredictions: 50,
  correctPredictions: 35,
  accuracy: 70,
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [userData, setUserData] = useState<Partial<UserDocument> | null>(null)
  const [loadingUserData, setLoadingUserData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    
    if (user) {
      // Show optimistic UI immediately with auth user data
      setUserData({
        displayName: user.displayName || 'Player',
        photoURL: user.photoURL || null,
        points: 0, // Will be updated when Firestore data loads
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        favoriteTeam: null,
        favoritePlayer: null,
      })
      
      setLoadingUserData(true)
      // Fetch user document from Firestore in background
      const userRef = doc(db, 'users', user.uid)
      getDoc(userRef)
        .then((userDoc) => {
          if (abortController.signal.aborted) return
          if (userDoc.exists()) {
            const data = userDoc.data() as UserDocument
            // Update with Firestore data when ready
            setUserData({
              displayName: data.displayName || user.displayName || 'Player',
              photoURL: data.photoURL || user.photoURL || null,
              points: data.points || 0,
              totalPredictions: data.totalPredictions || 0,
              correctPredictions: data.correctPredictions || 0,
              accuracy: data.accuracy || 0,
              favoriteTeam: data.favoriteTeam || null,
              favoritePlayer: data.favoritePlayer || null,
            })
          } else {
            // Use mock data if document doesn't exist yet
            setUserData({
              displayName: user.displayName || 'Player',
              photoURL: user.photoURL || null,
              ...mockUserData,
            })
          }
          setLoadingUserData(false)
        })
        .catch((error) => {
          if (abortController.signal.aborted) return
          console.error('Error fetching user data:', error)
          setError('Failed to load user data. Please try refreshing.')
          // Keep optimistic UI on error (already set above)
          setLoadingUserData(false)
        })
    } else {
      setUserData(null)
      setLoadingUserData(false)
    }
    
    return () => {
      abortController.abort()
    }
  }, [user])

  // Show loading state only while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">Loading...</div>
      </div>
    )
  }

  // Show not signed in page if user is not authenticated
  if (!user) {
    return <NotSignedIn />
  }

  // Show error state if data failed to load
  if (error) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-center text-ivory p-8">
          <p className="text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-lime-yellow text-midnight-violet rounded font-bold"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  // Render with optimistic UI (userData is set immediately from auth data)
  // Firestore data will update when it loads
  if (!userData) {
    // Fallback (shouldn't happen, but just in case)
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">Loading...</div>
      </div>
    )
  }

  return <ProfileClient user={user} userData={userData} />
}
