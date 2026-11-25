'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MY_GAMES_HOME_PATH } from '@/lib/app-routes'

/** Legacy URL — canonical home is /my-games/. */
export default function LegacyDashboardRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace(MY_GAMES_HOME_PATH)
  }, [router])

  return (
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
      <p className="text-ivory/70 text-sm">Redirecting…</p>
    </div>
  )
}