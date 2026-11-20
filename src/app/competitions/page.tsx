'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Unified Home — legacy Play route redirects to dashboard. */
export default function CompetitionsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/')
  }, [router])

  return (
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
      <p className="text-ivory/70 text-sm">Redirecting…</p>
    </div>
  )
}