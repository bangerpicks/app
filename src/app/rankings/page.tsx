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
    // Fetch all rankings data when user is available
    // Parallelize all-time rankings with weekly rankings for better performance
    const fetchAllRankings = async () => {
      setRankingsLoading(true)
      setWeeklyLoading(true)
      setRankingsError(null)
      setWeeklyError(null)
      
      let allTimeRankingsResult: RankingEntry[] = []
      
      try {
        // Start fetching all-time rankings and current gameweek in parallel
        const [rankingsResult, currentGameweek] = await Promise.all([
          getAllTimeRankings(user, 100).catch((error) => {
            console.error('Error fetching all-time rankings:', error)
            setRankingsError('Failed to load rankings. Please try again later.')
            return []
          }),
          getCurrentGameweek().catch((error) => {
            console.error('Error fetching current gameweek:', error)
            return null
          }),
        ])

        allTimeRankingsResult = rankingsResult

        // Set all-time rankings immediately
        setAllTimeRankings(allTimeRankingsResult)
        setRankingsLoading(false)

        // Handle weekly rankings if gameweek is available
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

        // Parallelize transformGameweekData and getWeeklyRankings since they're independent
        const [transformedData, rankings] = await Promise.all([
          transformGameweekData(currentGameweek, fixtures),
          getWeeklyRankings(
            currentGameweek.gameweekId,
            user?.uid || null
          ),
        ])

        setGameweekData(transformedData)
        setWeeklyRankings(rankings)
        setWeeklyLoading(false)
      } catch (error) {
        console.error('Error fetching rankings:', error)
        // Ensure loading states are cleared on error
        setRankingsLoading(false)
        setWeeklyLoading(false)
        // Only set error if we don't have all-time rankings loaded
        if (allTimeRankingsResult.length === 0) {
          setRankingsError('Failed to load rankings. Please try again later.')
        }
        setWeeklyError('Failed to load weekly rankings. Please try again later.')
        setWeeklyRankings(undefined)
        setGameweekData(undefined)
      }
    }

    if (user) {
      fetchAllRankings()
    } else {
      setAllTimeRankings([])
      setWeeklyRankings(undefined)
      setGameweekData(undefined)
      setRankingsLoading(false)
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
