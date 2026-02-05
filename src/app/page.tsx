'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect root to dashboard (with trailing slash for consistency)
    router.replace('/dashboard/')
  }, [router])

  return (
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
      <div className="text-ivory">Loading...</div>
    </div>
  )
}
