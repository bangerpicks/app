'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { ShopClient } from '@/components/dashboard/ShopClient'
import { ShopComingSoon } from '@/components/dashboard/ShopComingSoon'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { ShopItem } from '@/types/shop'
import { useUserProfile } from '@/lib/UserProfileProvider'
import { getAllShopItems } from '@/lib/shop'
import { computeShopPointsBalance } from '@/lib/redemptions'

export default function ShopPage() {
  const { user, loading: authLoading } = useAuth()
  const { profileDisplayName, hasValidProfileName, ownProfile, profileStatus } = useUserProfile()
  const [username, setUsername] = useState<string | undefined>(undefined)
  const [userPoints, setUserPoints] = useState<number>(0)
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [shopLoading, setShopLoading] = useState(true)

  useEffect(() => {
    if (hasValidProfileName && profileDisplayName) {
      setUsername(profileDisplayName)
    } else {
      setUsername(undefined)
    }
  }, [hasValidProfileName, profileDisplayName])

  useEffect(() => {
    if (profileStatus === 'loaded' && ownProfile) {
      setUserPoints(
        computeShopPointsBalance(
          ownProfile.correctPredictions,
          ownProfile.referralPoints,
          ownProfile.pointsSpent
        )
      )
    } else if (!user) {
      setUserPoints(0)
    }
  }, [profileStatus, ownProfile, user])

  useEffect(() => {
    getAllShopItems({ status: 'active' })
      .then(setShopItems)
      .catch((err) => {
        console.error('Error fetching shop items:', err)
        setShopItems([])
      })
      .finally(() => setShopLoading(false))
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <NotSignedIn />
  }

  const isComingSoon = process.env.NEXT_PUBLIC_SHOP_COMING_SOON === 'true'

  if (isComingSoon) {
    return <ShopComingSoon username={username} />
  }

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