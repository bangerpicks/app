'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { ShopClient } from '@/components/dashboard/ShopClient'
import { ShopComingSoon } from '@/components/dashboard/ShopComingSoon'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { ShopItem } from '@/types/shop'
import { getUserData } from '@/lib/users'
import { getAllShopItems } from '@/lib/shop'
import { computeShopPointsBalance } from '@/lib/redemptions'

export default function ShopPage() {
  const { user, loading: authLoading } = useAuth()
  const [username, setUsername] = useState<string | undefined>(undefined)
  const [userPoints, setUserPoints] = useState<number>(0)
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [shopLoading, setShopLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    
    if (user) {
      // Shop points = correct predictions + referral points (minus already redeemed)
      getUserData(user)
        .then(({ displayName, referralPoints, correctPredictions, pointsSpent }) => {
          if (abortController.signal.aborted) return
          setUsername(displayName)
          setUserPoints(computeShopPointsBalance(correctPredictions, referralPoints, pointsSpent))
          setError(null)
        })
        .catch((error) => {
          if (abortController.signal.aborted) return
          console.error('Error fetching user data:', error)
          setError('Failed to load user data. Please try refreshing.')
          setUsername(user.displayName || undefined)
          setUserPoints(0)
        })
    } else {
      setUsername(undefined)
      setUserPoints(0)
      setError(null)
    }
    
    return () => {
      abortController.abort()
    }
  }, [user])

  useEffect(() => {
    getAllShopItems({ status: 'active' })
      .then(setShopItems)
      .catch((err) => {
        console.error('Error fetching shop items:', err)
        setShopItems([])
      })
      .finally(() => setShopLoading(false))
  }, [])

  // Show loading state (or nothing) while checking authentication
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

  // Check if coming soon mode is enabled via environment variable
  const isComingSoon = process.env.NEXT_PUBLIC_SHOP_COMING_SOON === 'true'

  // Render coming soon page if enabled
  if (isComingSoon) {
    return <ShopComingSoon username={username} />
  }

  // Show loading while fetching shop items
  if (shopLoading) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">Loading...</div>
      </div>
    )
  }

  return (
    <ShopClient items={shopItems} userPoints={userPoints} username={username} />
  )
}
