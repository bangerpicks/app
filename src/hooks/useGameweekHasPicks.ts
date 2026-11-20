'use client'

import { useEffect, useState } from 'react'
import { userHasAnyPickForGameweek } from '@/lib/predictions'
import { useAuth } from '@/lib/AuthProvider'

export function useGameweekHasPicks(
  gameweekId: string,
  enabled = true
): boolean | undefined {
  const { user } = useAuth()
  const [hasAnyPicks, setHasAnyPicks] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    if (!enabled || !gameweekId || !user?.uid) {
      setHasAnyPicks(undefined)
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
  }, [gameweekId, enabled, user?.uid])

  return hasAnyPicks
}