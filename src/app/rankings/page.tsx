'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { RankingsClient } from '@/components/dashboard/RankingsClient'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { getUserDisplayName, getAllTimeRankings } from '@/lib/users'
import {
  RankingEntry,
  GameweekRankingData,
  PastGameweekOption,
} from '@/types/dashboard'
import {
  getCurrentGameweek,
  getWeeklyRankings,
  transformGameweekData,
  getGameweekFixtureDetails,
} from '@/lib/rankings'
import { getAllGameweeks, getGameweekById } from '@/lib/admin'

const PAST_GAMEWEEKS_LIMIT = 10

export default function RankingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [username, setUsername] = useState<string | undefined>(undefined)
  const [allTimeRankings, setAllTimeRankings] = useState<RankingEntry[]>([])
  const [weeklyRankings, setWeeklyRankings] = useState<RankingEntry[] | undefined>(undefined)
  const [gameweekData, setGameweekData] = useState<GameweekRankingData | undefined>(undefined)
  const [currentGameweekId, setCurrentGameweekId] = useState<string | null>(null)
  const [currentGameweekData, setCurrentGameweekData] = useState<GameweekRankingData | undefined>(undefined)
  const [currentWeeklyRankings, setCurrentWeeklyRankings] = useState<RankingEntry[] | undefined>(undefined)
  const [completedGameweeks, setCompletedGameweeks] = useState<PastGameweekOption[]>([])
  const [selectedGameweekId, setSelectedGameweekId] = useState<string | null>(null)
  const [latestCompletedGameweekId, setLatestCompletedGameweekId] = useState<string | null>(null)
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const [rankingsError, setRankingsError] = useState<string | null>(null)
  const [weeklyError, setWeeklyError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    
    if (user) {
      // Fetch display name from Firestore
      getUserDisplayName(user)
        .then((displayName) => {
          if (abortController.signal.aborted) return
          setUsername(displayName)
        })
        .catch((error) => {
          if (abortController.signal.aborted) return
          console.error('Error fetching display name:', error)
          setUsername(user.displayName || undefined)
        })
    } else {
      setUsername(undefined)
    }
    
    return () => {
      abortController.abort()
    }
  }, [user])

  useEffect(() => {
    const abortController = new AbortController()
    
    // Fetch all rankings data when user is available
    // Parallelize all-time rankings with weekly rankings for better performance
    const fetchAllRankings = async () => {
      setRankingsLoading(true)
      setWeeklyLoading(true)
      setRankingsError(null)
      setWeeklyError(null)
      
      let allTimeRankingsResult: RankingEntry[] = []
      
      try {
        // Fetch all-time rankings, current gameweek, and latest completed gameweek (for "last week" badge)
        const [rankingsResult, currentGameweek, completedGameweeks] = await Promise.all([
          getAllTimeRankings(user, 100).catch((error) => {
            console.error('Error fetching all-time rankings:', error)
            if (!abortController.signal.aborted) {
              setRankingsError('Failed to load rankings. Please try again later.')
            }
            return []
          }),
          getCurrentGameweek().catch((error) => {
            console.error('Error fetching current gameweek:', error)
            return null
          }),
          getAllGameweeks({ sortBy: 'date', sortOrder: 'desc' }).catch((err) => {
            console.error('Error fetching gameweeks for past weeks:', err)
            return []
          }),
        ])

        if (abortController.signal.aborted) return

        allTimeRankingsResult = rankingsResult
        const completedOnly = completedGameweeks.filter(
          (gw) => gw.status === 'completed' || gw.status === 'archived'
        )
        const latestCompleted = completedOnly.length > 0 ? completedOnly[0].gameweekId : null
        setLatestCompletedGameweekId(latestCompleted)

        // Past gameweeks list: published statuses only. Drafts are admin-only.
        const pastOptions: PastGameweekOption[] = completedGameweeks
          .slice(0, PAST_GAMEWEEKS_LIMIT)
          .map((gw) => ({ gameweekId: gw.gameweekId, name: gw.name }))
        setCompletedGameweeks(pastOptions)

        // Set all-time rankings immediately
        setAllTimeRankings(allTimeRankingsResult)
        setRankingsLoading(false)

        // Handle weekly rankings if gameweek is available
        if (!currentGameweek) {
          // No gameweek available, disable weekly view
          setCurrentGameweekId(null)
          setCurrentGameweekData(undefined)
          setCurrentWeeklyRankings(undefined)
          setWeeklyRankings(undefined)
          setGameweekData(undefined)
          setSelectedGameweekId(null)
          setWeeklyLoading(false)
          return
        }

        // Get fixture details
        const fixtures = await getGameweekFixtureDetails(currentGameweek.gameweekId)
        
        if (abortController.signal.aborted) return
        
        if (fixtures.length === 0) {
          // No fixtures found, disable weekly view
          setCurrentGameweekId(null)
          setCurrentGameweekData(undefined)
          setCurrentWeeklyRankings(undefined)
          setWeeklyRankings(undefined)
          setGameweekData(undefined)
          setSelectedGameweekId(null)
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

        if (abortController.signal.aborted) return

        setCurrentGameweekId(currentGameweek.gameweekId)
        setCurrentGameweekData(transformedData)
        setCurrentWeeklyRankings(rankings)
        setGameweekData(transformedData)
        setWeeklyRankings(rankings)
        setSelectedGameweekId(currentGameweek.gameweekId)
        setWeeklyLoading(false)
      } catch (error) {
        if (abortController.signal.aborted) return
        console.error('Error fetching rankings:', error)
        // Ensure loading states are cleared on error
        setRankingsLoading(false)
        setWeeklyLoading(false)
        // Only set error if we don't have all-time rankings loaded
        if (allTimeRankingsResult.length === 0) {
          setRankingsError('Failed to load rankings. Please try again later.')
        }
        setWeeklyError('Failed to load weekly rankings. Please try again later.')
        setCurrentGameweekId(null)
        setCurrentGameweekData(undefined)
        setCurrentWeeklyRankings(undefined)
        setWeeklyRankings(undefined)
        setGameweekData(undefined)
        setSelectedGameweekId(null)
      }
    }

    if (user) {
      fetchAllRankings()
    } else {
      setAllTimeRankings([])
      setWeeklyRankings(undefined)
      setGameweekData(undefined)
      setCurrentGameweekId(null)
      setCurrentGameweekData(undefined)
      setCurrentWeeklyRankings(undefined)
      setCompletedGameweeks([])
      setSelectedGameweekId(null)
      setLatestCompletedGameweekId(null)
      setRankingsLoading(false)
      setWeeklyLoading(false)
    }
    
    return () => {
      abortController.abort()
    }
  }, [user])

  // Lazy-load past week when user selects a different gameweek
  useEffect(() => {
    if (!user || !selectedGameweekId || selectedGameweekId === currentGameweekId) return
    const abortController = new AbortController()
    setWeeklyLoading(true)
    setWeeklyError(null)
    const loadPastWeek = async () => {
      try {
        const gameweek = await getGameweekById(selectedGameweekId)
        if (abortController.signal.aborted || !gameweek) {
          setWeeklyLoading(false)
          return
        }
        const fixtures = await getGameweekFixtureDetails(selectedGameweekId)
        if (abortController.signal.aborted || fixtures.length === 0) {
          setWeeklyRankings(undefined)
          setGameweekData(undefined)
          setWeeklyLoading(false)
          return
        }
        const [transformedData, rankings] = await Promise.all([
          transformGameweekData(gameweek, fixtures),
          getWeeklyRankings(selectedGameweekId, user?.uid || null),
        ])
        if (abortController.signal.aborted) return
        setGameweekData(transformedData)
        setWeeklyRankings(rankings)
      } catch (error) {
        if (!abortController.signal.aborted) {
          setWeeklyError('Failed to load weekly rankings. Please try again later.')
          setWeeklyRankings(undefined)
          setGameweekData(undefined)
        }
      } finally {
        if (!abortController.signal.aborted) setWeeklyLoading(false)
      }
    }
    loadPastWeek()
    return () => abortController.abort()
  }, [user, selectedGameweekId, currentGameweekId])

  // When selection is current week, show current week data
  useEffect(() => {
    if (selectedGameweekId === currentGameweekId && currentGameweekData && currentWeeklyRankings) {
      setGameweekData(currentGameweekData)
      setWeeklyRankings(currentWeeklyRankings)
    }
  }, [selectedGameweekId, currentGameweekId, currentGameweekData, currentWeeklyRankings])

  const handleSelectGameweek = (gameweekId: string | null) => {
    setSelectedGameweekId(gameweekId)
    if (gameweekId === currentGameweekId && currentGameweekData && currentWeeklyRankings) {
      setGameweekData(currentGameweekData)
      setWeeklyRankings(currentWeeklyRankings)
    }
  }

  // Show full-page loading only for auth or initial rankings/weekly load (not when loading a past week)
  const initialWeeklyLoading = weeklyLoading && !currentGameweekData
  if (authLoading || rankingsLoading || initialWeeklyLoading) {
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
  // Note: This uses hardcoded text but could be translated if needed
  // Since rankingsError might contain dynamic error messages from the API
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
      latestCompletedGameweekId={latestCompletedGameweekId}
      completedGameweeks={completedGameweeks}
      currentGameweekId={currentGameweekId}
      selectedGameweekId={selectedGameweekId}
      onSelectGameweek={handleSelectGameweek}
      weeklyLoading={weeklyLoading}
    />
  )
}
