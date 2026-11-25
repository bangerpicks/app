'use client'

import { useEffect, useState } from 'react'
import { userHasAnyPickForGameweek } from '@/lib/predictions'
import { useAuth } from '@/lib/AuthProvider'

export function useGameweekHasPicks(
  gameweekId: string,
  enabled = true
): boolean | undefined {
  const { user, loading: authLoading } = useAuth()
  const [hasAnyPicks, setHasAnyPicks] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    if (!enabled || !gameweekId) {
      setHasAnyPicks(undefined)
      return
    }
    if (authLoading) {
      setHasAnyPicks(undefined)
      return
    }
    if (!user?.uid) {
      setHasAnyPicks(false)
      return
    }

    let cancelled = false
    userHasAnyPickForGameweek(user.uid, gameweekId)
      .then((value) => {
        if (!cancelled) setHasAnyPicks(value)
      })
      .catch(() => {
        if (!cancelled) setHasAnyPicks(false)
      })

    return () => {
      cancelled = true
    }
  }, [gameweekId, enabled, user?.uid, authLoading])

  return hasAnyPicks
}