'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { SettingsClient } from '@/components/dashboard/SettingsClient'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()

  // Show loading state while checking authentication
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

  return <SettingsClient />
}
