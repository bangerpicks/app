'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { ShopClient } from '@/components/dashboard/ShopClient'
import { ShopComingSoon } from '@/components/dashboard/ShopComingSoon'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { ShopItem } from '@/types/shop'
import { getUserData } from '@/lib/users'

// TODO: Replace with actual data fetching from Firebase/Firestore
// This is mock data for initial development
const mockShopItems: ShopItem[] = [
  {
    itemId: 'item1',
    name: 'Premium Badge',
    description: 'Show off your prediction skills with this exclusive premium badge on your profile',
    category: 'digital',
    pointsCost: 100,
    imageUrl: '',
    featured: true,
    status: 'active',
    badge: 'premium',
  },
  {
    itemId: 'item2',
    name: 'Dark Theme',
    description: 'Unlock a sleek dark theme for your profile and dashboard',
    category: 'digital',
    pointsCost: 150,
    imageUrl: '',
    featured: false,
    status: 'active',
    theme: 'dark',
  },
  {
    itemId: 'item3',
    name: 'Banger Picks T-Shirt',
    description: 'Official Banger Picks branded t-shirt. 100% cotton, available in multiple sizes',
    category: 'physical',
    pointsCost: 250,
    imageUrl: '',
    featured: true,
    status: 'active',
    shippingRequired: true,
    stock: 50,
  },
  {
    itemId: 'item4',
    name: 'Prediction Master Badge',
    description: 'Earned by players with 80%+ accuracy. Display your mastery!',
    category: 'digital',
    pointsCost: 200,
    imageUrl: '',
    featured: false,
    status: 'active',
    badge: 'master',
  },
  {
    itemId: 'item5',
    name: 'Custom Profile Frame',
    description: 'Add a custom frame to your profile picture to stand out from the crowd',
    category: 'digital',
    pointsCost: 75,
    imageUrl: '',
    featured: false,
    status: 'active',
    customization: { frame: 'gold' },
  },
  {
    itemId: 'item6',
    name: 'Banger Picks Hoodie',
    description: 'Stay warm with our premium hoodie featuring the Banger Picks logo',
    category: 'physical',
    pointsCost: 400,
    imageUrl: '',
    featured: false,
    status: 'active',
    shippingRequired: true,
    stock: 30,
  },
  {
    itemId: 'item7',
    name: 'Weekly Winner Badge',
    description: 'Celebrate your weekly victories with this exclusive badge',
    category: 'digital',
    pointsCost: 120,
    imageUrl: '',
    featured: false,
    status: 'active',
    badge: 'weekly-winner',
  },
  {
    itemId: 'item8',
    name: 'Banger Picks Mug',
    description: 'Start your morning with your favorite football predictions. Ceramic mug with logo',
    category: 'physical',
    pointsCost: 180,
    imageUrl: '',
    featured: false,
    status: 'active',
    shippingRequired: true,
    stock: 100,
  },
]

export default function ShopPage() {
  const { user, loading: authLoading } = useAuth()
  const [username, setUsername] = useState<string | undefined>(undefined)
  const [userPoints, setUserPoints] = useState<number>(0)

  useEffect(() => {
    if (user) {
      // Fetch display name and referral points from Firestore in a single call
      getUserData(user)
        .then(({ displayName, referralPoints }) => {
          setUsername(displayName)
          setUserPoints(referralPoints)
        })
        .catch((error) => {
          console.error('Error fetching user data:', error)
          setUsername(user.displayName || undefined)
          setUserPoints(0)
        })
    } else {
      setUsername(undefined)
      setUserPoints(0)
    }
  }, [user])

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

  // Check if coming soon mode is enabled via environment variable
  const isComingSoon = process.env.NEXT_PUBLIC_SHOP_COMING_SOON === 'true'

  // TODO: Fetch real shop items from Firebase
  // const shopItems = await getShopItems()

  // Render coming soon page if enabled, otherwise render full shop
  if (isComingSoon) {
    return <ShopComingSoon username={username} />
  }

  return (
    <ShopClient items={mockShopItems} userPoints={userPoints} username={username} />
  )
}
