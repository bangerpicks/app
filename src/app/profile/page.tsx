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

  useEffect(() => {
    if (user) {
      setLoadingUserData(true)
      // Fetch user document from Firestore
      const userRef = doc(db, 'users', user.uid)
      getDoc(userRef)
        .then((userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data() as UserDocument
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
          console.error('Error fetching user data:', error)
          // Fallback to mock data on error
          setUserData({
            displayName: user.displayName || 'Player',
            photoURL: user.photoURL || null,
            ...mockUserData,
          })
          setLoadingUserData(false)
        })
    } else {
      setUserData(null)
      setLoadingUserData(false)
    }
  }, [user])

  // Show loading state while checking authentication or fetching user data
  if (authLoading || (user && loadingUserData)) {
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

  // Only render if we have userData (should always be set after loading completes for authenticated users)
  if (!userData) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">Loading...</div>
      </div>
    )
  }

  return <ProfileClient user={user} userData={userData} />
}
