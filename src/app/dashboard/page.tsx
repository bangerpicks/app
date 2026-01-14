'use client'

import { useState, useEffect } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/lib/AuthProvider'
import { getUserDisplayName } from '@/lib/users'
import { getUserPredictions, getGameweekPlayerCount } from '@/lib/predictions'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { GameweekData, MatchCardData, GameweekStatus, FormResult } from '@/types/dashboard'
import { getActiveGameweek, getGameweekFixtures, AdminGameweekData, GameweekFixtureData } from '@/lib/admin'
import { getStandings } from '@/lib/api-football'
import { useLiveMatches } from '@/lib/useLiveMatches'

/**
 * Map admin gameweek status to dashboard status based on deadline
 */
function mapGameweekStatus(deadline: Timestamp, forceOpenForTesting?: boolean): GameweekStatus {
  // If force open is enabled, always return OPEN
  if (forceOpenForTesting === true) {
    return 'OPEN'
  }
  
  const now = new Date()
  const deadlineDate = deadline.toDate()
  
  if (now < deadlineDate) {
    return 'OPEN'
  } else {
    return 'CLOSED'
  }
}

/**
 * Convert AdminGameweekData to GameweekData
 */
function convertGameweekData(adminGameweek: AdminGameweekData): GameweekData {
  return {
    gameweekId: adminGameweek.gameweekId,
    name: adminGameweek.name,
    playerCount: 0, // TODO: Fetch actual player count
    status: mapGameweekStatus(adminGameweek.deadline, adminGameweek.forceOpenForTesting),
    deadline: adminGameweek.deadline.toDate(),
    startDate: adminGameweek.startDate.toDate(),
    endDate: adminGameweek.endDate.toDate(),
    forceOpenForTesting: adminGameweek.forceOpenForTesting,
  }
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * Calculate season year from date (season starts in August)
 */
function calculateSeason(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-12
  // If date is Jan-Jul, we're in second half of season (use previous year)
  // If date is Aug-Dec, we're in first half of season (use current year)
  return month >= 8 ? year : year - 1
}

/**
 * Convert form string (e.g., "WWDLW") to FormResult array
 */
function convertFormString(formString: string): FormResult[] {
  if (!formString) return []
  // Take last 5 characters and convert to array
  return formString.slice(-5).split('').filter((char): char is FormResult => 
    char === 'W' || char === 'D' || char === 'L'
  )
}

/**
 * Convert GameweekFixtureData to MatchCardData
 */
function convertFixtureToMatchCard(
  fixtureData: GameweekFixtureData,
  teamPositions: Map<number, number> = new Map(),
  teamForms: Map<number, FormResult[]> = new Map()
): MatchCardData {
  const fixture = fixtureData.fixture.fixture
  const fixtureDate = new Date(fixture.date)
  
  // Map API-Football status to dashboard match status
  const apiStatus = fixture.status.short
  let matchStatus: string
  if (apiStatus === 'NS' || apiStatus === 'TBD') {
    matchStatus = 'TBP' // To Be Played
  } else if (apiStatus === '1H' || apiStatus === '2H' || apiStatus === 'HT' || apiStatus === 'ET' || apiStatus === 'P') {
    matchStatus = 'LIVE' // Live match (First Half, Second Half, Half Time, Extra Time, Penalties)
  } else {
    matchStatus = apiStatus // 'FT', 'AET', 'PEN', etc.
  }
  
  // Get score if available
  const score = fixtureData.fixture.goals.home !== null && fixtureData.fixture.goals.away !== null
    ? {
        home: fixtureData.fixture.goals.home,
        away: fixtureData.fixture.goals.away,
      }
    : undefined
  
  // Get minute for live matches
  const minute = fixture.status.elapsed ?? undefined
  
  return {
    fixtureId: fixtureData.fixtureId,
    league: {
      id: fixtureData.league.id,
      name: fixtureData.league.name,
      logo: fixtureData.league.logo,
    },
    date: fixtureDate,
    time: formatTime(fixtureDate),
    homeTeam: {
      id: fixtureData.teams.home.id,
      name: fixtureData.teams.home.name,
      logo: fixtureData.teams.home.logo,
      position: teamPositions.get(fixtureData.teams.home.id) || 0,
      form: teamForms.get(fixtureData.teams.home.id) || [],
    },
    awayTeam: {
      id: fixtureData.teams.away.id,
      name: fixtureData.teams.away.name,
      logo: fixtureData.teams.away.logo,
      position: teamPositions.get(fixtureData.teams.away.id) || 0,
      form: teamForms.get(fixtureData.teams.away.id) || [],
    },
    matchStatus,
    minute,
    score,
  }
}

// TODO: Replace with actual data fetching from Firebase/Firestore
// This is mock data for initial development
const mockGameweek: GameweekData = {
  gameweekId: 'gw1',
  name: 'GAMEWEEK 5',
  playerCount: 0,
  status: 'OPEN',
}

const mockMatches: MatchCardData[] = [
  {
    fixtureId: 1,
    league: {
      id: 39,
      name: 'Premier League',
    },
    date: new Date('2024-01-20T15:00:00'),
    time: '3:00 PM',
    matchStatus: 'FT',
    score: {
      home: 2,
      away: 1,
    },
    homeTeam: {
      id: 33,
      name: 'Manchester United',
      logo: '',
      position: 6,
      form: ['W', 'W', 'D', 'L', 'W'],
    },
    awayTeam: {
      id: 42,
      name: 'Brighton',
      logo: '',
      position: 8,
      form: ['L', 'W', 'W', 'D', 'L'],
    },
  },
  {
    fixtureId: 2,
    league: {
      id: 39,
      name: 'Premier League',
    },
    date: new Date('2024-01-20T17:30:00'),
    time: '5:30 PM',
    matchStatus: 'LIVE',
    minute: 67,
    score: {
      home: 1,
      away: 1,
    },
    homeTeam: {
      id: 49,
      name: 'Chelsea',
      logo: '',
      position: 10,
      form: ['D', 'L', 'W', 'W', 'D'],
    },
    awayTeam: {
      id: 50,
      name: 'Manchester City',
      logo: '',
      position: 2,
      form: ['W', 'W', 'W', 'D', 'W'],
    },
  },
  {
    fixtureId: 3,
    league: {
      id: 39,
      name: 'Premier League',
    },
    date: new Date('2024-01-21T14:00:00'),
    time: '2:00 PM',
    matchStatus: 'TBP',
    homeTeam: {
      id: 40,
      name: 'Liverpool',
      logo: '',
      position: 1,
      form: ['W', 'W', 'W', 'W', 'W'],
    },
    awayTeam: {
      id: 42,
      name: 'Arsenal',
      logo: '',
      position: 3,
      form: ['W', 'D', 'W', 'L', 'W'],
    },
  },
]

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [username, setUsername] = useState<string | undefined>(undefined)
  const [gameweek, setGameweek] = useState<GameweekData | null>(null)
  const [initialMatches, setInitialMatches] = useState<MatchCardData[]>([])
  const [gameweekId, setGameweekId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    async function fetchActiveGameweek() {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch active gameweek
        const activeGameweek = await getActiveGameweek()
        
        if (!activeGameweek) {
          // No active gameweek found, use mock data as fallback
          console.log('No active gameweek found, using mock data')
          setGameweek(mockGameweek)
          setInitialMatches(mockMatches)
          setGameweekId(null)
          setLoading(false)
          return
        }
        
        // Convert admin gameweek to dashboard format
        const convertedGameweek = convertGameweekData(activeGameweek)
        setGameweekId(activeGameweek.gameweekId)
        
        // Fetch player count for the gameweek
        let playerCount = 0
        if (activeGameweek.fixtureIds && activeGameweek.fixtureIds.length > 0) {
          try {
            playerCount = await getGameweekPlayerCount(activeGameweek.fixtureIds)
          } catch (err) {
            console.warn('Error fetching player count:', err)
            // Continue with 0 if there's an error
          }
        }
        
        // Update gameweek with player count
        const gameweekWithCount = { ...convertedGameweek, playerCount }
        setGameweek(gameweekWithCount)
        
        // Fetch fixtures for the gameweek
        const fixtures = await getGameweekFixtures(activeGameweek.gameweekId)
        
        // Group fixtures by league to fetch standings efficiently
        const leaguesMap = new Map<number, { leagueId: number; date: Date }>()
        fixtures.forEach((fixture) => {
          const leagueId = fixture.league.id
          const fixtureDate = new Date(fixture.fixture.fixture.date)
          if (!leaguesMap.has(leagueId)) {
            leaguesMap.set(leagueId, { leagueId, date: fixtureDate })
          }
        })
        
        // Fetch standings for each unique league
        const teamPositions = new Map<number, number>()
        const teamForms = new Map<number, FormResult[]>()
        
        await Promise.all(
          Array.from(leaguesMap.values()).map(async ({ leagueId, date }) => {
            try {
              const season = calculateSeason(date)
              const standings = await getStandings(leagueId, season)
              standings.forEach((team) => {
                teamPositions.set(team.team.id, team.rank)
                teamForms.set(team.team.id, convertFormString(team.form))
              })
            } catch (err) {
              console.warn(`Error fetching standings for league ${leagueId}:`, err)
              // Continue without standings for this league
            }
          })
        )
        
        // Convert fixtures to match card format with positions and form
        const convertedMatches = fixtures.map((fixture) =>
          convertFixtureToMatchCard(fixture, teamPositions, teamForms)
        )
        // Sort matches by start time (date)
        const sortedMatches = convertedMatches.sort((a, b) => 
          a.date.getTime() - b.date.getTime()
        )

        // Load user predictions if user is authenticated
        if (user) {
          try {
            const fixtureIds = sortedMatches.map((match) => match.fixtureId)
            const predictions = await getUserPredictions(user.uid, fixtureIds)
            
            // Merge predictions into match data
            const matchesWithPredictions = sortedMatches.map((match) => ({
              ...match,
              userPrediction: predictions.get(match.fixtureId) || null,
            }))
            
            setInitialMatches(matchesWithPredictions)
          } catch (err) {
            console.warn('Error loading user predictions:', err)
            // Continue without predictions if loading fails
            setInitialMatches(sortedMatches)
          }
        } else {
          setInitialMatches(sortedMatches)
        }
      } catch (err: any) {
        console.error('Error fetching active gameweek:', err)
        setError(err.message || 'Failed to load gameweek data')
        // Fallback to mock data on error
        setGameweek(mockGameweek)
        setInitialMatches(mockMatches)
        setGameweekId(null)
      } finally {
        setLoading(false)
      }
    }
    
    fetchActiveGameweek()
  }, [user])

  // Use fetched data or fallback to mock data
  const displayGameweek = gameweek || mockGameweek
  const baseMatches = initialMatches.length > 0 ? initialMatches : mockMatches
  
  // Apply live updates to matches via Firestore listeners (updated by Cloud Function)
  // Hook must be called before early returns to maintain consistent hook order
  const liveMatches = useLiveMatches(gameweekId, baseMatches)

  if (authLoading || loading) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">Loading...</div>
      </div>
    )
  }

  if (error && !gameweek) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">Error: {error}</div>
      </div>
    )
  }

  return (
    <DashboardClient
      gameweek={displayGameweek}
      playerCount={displayGameweek.playerCount}
      matches={liveMatches}
      username={username}
    />
  )
}
