'use client'

import { useCallback, useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import { joinCompetition } from './competitions'
import { fetchHomeMembershipSummary } from './home-catalog-client'
import { isCompetitionInMyGames } from './home-membership-filter.mjs'
import type { CompetitionJoinVia } from '@/types/competition'

export type LeaveLeagueResponse = {
  mode: 'immediate' | 'deferred' | 'purged'
  gameweekId?: string
}

export async function leaveLeague(competitionId: string): Promise<LeaveLeagueResponse> {
  const fn = httpsCallable<{ competitionId: string }, LeaveLeagueResponse>(functions, 'leaveLeague')
  const res = await fn({ competitionId })
  return res.data
}

export async function joinLeague(
  uid: string,
  competitionId: string,
  joinedVia: CompetitionJoinVia = 'discover'
) {
  return joinCompetition(uid, competitionId, joinedVia)
}

export function useMyLeagueMembership(uid: string | null | undefined) {
  const [competitionIds, setCompetitionIds] = useState<string[]>([])
  const [dismissedCompetitionIds, setDismissedCompetitionIds] = useState<string[]>([])
  const [loading, setLoading] = useState(Boolean(uid))

  const refresh = useCallback(async () => {
    if (!uid) {
      setCompetitionIds([])
      setDismissedCompetitionIds([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const summary = await fetchHomeMembershipSummary(uid)
      setCompetitionIds(summary.competitionIds)
      setDismissedCompetitionIds(summary.dismissedCompetitionIds)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const isMember = useCallback(
    (competitionId: string) =>
      isCompetitionInMyGames(competitionId, {
        memberCompetitionIds: competitionIds,
        dismissedCompetitionIds,
      }),
    [competitionIds, dismissedCompetitionIds]
  )

  return { competitionIds, dismissedCompetitionIds, loading, refresh, isMember }
}