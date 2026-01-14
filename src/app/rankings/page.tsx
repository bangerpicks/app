'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { RankingsClient } from '@/components/dashboard/RankingsClient'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { getUserDisplayName, getAllTimeRankings } from '@/lib/users'
import {
  RankingEntry,
  GameweekRankingData,
} from '@/types/dashboard'
import {
  getCurrentGameweek,
  getWeeklyRankings,
  transformGameweekData,
  getGameweekFixtureDetails,
} from '@/lib/rankings'

export default function RankingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [username, setUsername] = useState<string | undefined>(undefined)
  const [allTimeRankings, setAllTimeRankings] = useState<RankingEntry[]>([])
  const [weeklyRankings, setWeeklyRankings] = useState<RankingEntry[] | undefined>(undefined)
  const [gameweekData, setGameweekData] = useState<GameweekRankingData | undefined>(undefined)
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const [rankingsError, setRankingsError] = useState<string | null>(null)
  const [weeklyError, setWeeklyError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      // Fetch display name from Firestore
      getUserDisplayName(user)
        .then((displayName) => {
          setUsername(displayName)
        })
        .catch((error) => {
          console.error('Error fetching display name:', error)
          setUsername(user.displayName || undefined)
        })
    } else {
      setUsername(undefined)
    }
  }, [user])

  useEffect(() => {
    // Fetch all-time rankings when user is available
    const fetchRankings = async () => {
      setRankingsLoading(true)
      setRankingsError(null)
      try {
        const rankings = await getAllTimeRankings(user, 100)
        setAllTimeRankings(rankings)
      } catch (error) {
        console.error('Error fetching all-time rankings:', error)
        setRankingsError('Failed to load rankings. Please try again later.')
        setAllTimeRankings([])
      } finally {
        setRankingsLoading(false)
      }
    }

    if (user) {
      fetchRankings()
    } else {
      setAllTimeRankings([])
      setRankingsLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Fetch weekly rankings when user is available
    const fetchWeeklyRankings = async () => {
      setWeeklyLoading(true)
      setWeeklyError(null)
      try {
        // Get current gameweek
        const currentGameweek = await getCurrentGameweek()
        
        if (!currentGameweek) {
          // No gameweek available, disable weekly view
          setWeeklyRankings(undefined)
          setGameweekData(undefined)
          setWeeklyLoading(false)
          return
        }

        // Get fixture details
        const fixtures = await getGameweekFixtureDetails(currentGameweek.gameweekId)
        
        if (fixtures.length === 0) {
          // No fixtures found, disable weekly view
          setWeeklyRankings(undefined)
          setGameweekData(undefined)
          setWeeklyLoading(false)
          return
        }

        // Transform gameweek data
        const transformedData = await transformGameweekData(currentGameweek, fixtures)
        setGameweekData(transformedData)

        // Get weekly rankings
        const rankings = await getWeeklyRankings(
          currentGameweek.gameweekId,
          user?.uid || null
        )
        setWeeklyRankings(rankings)
      } catch (error) {
        console.error('Error fetching weekly rankings:', error)
        setWeeklyError('Failed to load weekly rankings. Please try again later.')
        setWeeklyRankings(undefined)
        setGameweekData(undefined)
      } finally {
        setWeeklyLoading(false)
      }
    }

    if (user) {
      fetchWeeklyRankings()
    } else {
      setWeeklyRankings(undefined)
      setGameweekData(undefined)
      setWeeklyLoading(false)
    }
  }, [user])

  // Show loading state (or nothing) while checking authentication
  if (authLoading || rankingsLoading || weeklyLoading) {
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

  // Show error state if rankings failed to load
  if (rankingsError) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory text-center">
          <p className="text-lg mb-2">Error loading rankings</p>
          <p className="text-sm text-ivory/70">{rankingsError}</p>
        </div>
      </div>
    )
  }

  return (
    <RankingsClient
      allTimeRankings={allTimeRankings}
      weeklyRankings={weeklyRankings}
      gameweekData={gameweekData}
      username={username}
    />
  )
}
