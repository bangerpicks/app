'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { getUserDisplayName } from '@/lib/users'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { GameweekData, MatchCardData } from '@/types/dashboard'

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

  // TODO: Fetch real data from Firebase
  // const gameweek = await getCurrentGameweek()
  // const matches = await getGameweekFixtures(gameweek.gameweekId)
  // const playerCount = await getGameweekPlayerCount(gameweek.gameweekId)

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-ivory">Loading...</div>
      </div>
    )
  }

  return (
    <DashboardClient
      gameweek={mockGameweek}
      playerCount={mockGameweek.playerCount}
      matches={mockMatches}
      username={username}
    />
  )
}
