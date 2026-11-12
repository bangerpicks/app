'use client'

import { useEffect } from 'react'

/**
 * Root is only a bounce to the dashboard. Use a hard navigation so we never
 * depend on App Router soft-nav (which can hang with static export / trailingSlash).
 */
export default function HomePage() {
  useEffect(() => {
    window.location.replace('/dashboard/')
  }, [])

  return (
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
      <div className="text-ivory">Loading...</div>
    </div>
  )
}
