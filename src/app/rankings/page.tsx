'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import { RankingsClient } from '@/components/dashboard/RankingsClient'
import { NotSignedIn } from '@/components/dashboard/NotSignedIn'
import { getUserDisplayName } from '@/lib/users'
import {
  RankingEntry,
  GameweekRankingData,
  GameweekData,
} from '@/types/dashboard'

// TODO: Replace with actual data fetching from Firebase/Firestore
// This is mock data for initial development

// Mock gameweek data
const mockGameweek: GameweekData = {
  gameweekId: 'gw5',
  name: 'GAMEWEEK 5',
  playerCount: 65,
  status: 'OPEN',
}

// Mock fixtures for the gameweek (5 matches - Manchester City vs Chelsea)
const mockFixtures = [
  {
    fixtureId: 1,
    homeTeam: {
      id: 50,
      name: 'Manchester City',
      logo: '',
      position: 2,
      form: ['W', 'W', 'W', 'D', 'W'],
    },
    awayTeam: {
      id: 49,
      name: 'Chelsea',
      logo: '',
      position: 10,
      form: ['D', 'L', 'W', 'W', 'D'],
    },
  },
  {
    fixtureId: 2,
    homeTeam: {
      id: 50,
      name: 'Manchester City',
      logo: '',
      position: 2,
      form: ['W', 'W', 'W', 'D', 'W'],
    },
    awayTeam: {
      id: 49,
      name: 'Chelsea',
      logo: '',
      position: 10,
      form: ['D', 'L', 'W', 'W', 'D'],
    },
  },
  {
    fixtureId: 3,
    homeTeam: {
      id: 50,
      name: 'Manchester City',
      logo: '',
      position: 2,
      form: ['W', 'W', 'W', 'D', 'W'],
    },
    awayTeam: {
      id: 49,
      name: 'Chelsea',
      logo: '',
      position: 10,
      form: ['D', 'L', 'W', 'W', 'D'],
    },
  },
  {
    fixtureId: 4,
    homeTeam: {
      id: 50,
      name: 'Manchester City',
      logo: '',
      position: 2,
      form: ['W', 'W', 'W', 'D', 'W'],
    },
    awayTeam: {
      id: 49,
      name: 'Chelsea',
      logo: '',
      position: 10,
      form: ['D', 'L', 'W', 'W', 'D'],
    },
  },
  {
    fixtureId: 5,
    homeTeam: {
      id: 50,
      name: 'Manchester City',
      logo: '',
      position: 2,
      form: ['W', 'W', 'W', 'D', 'W'],
    },
    awayTeam: {
      id: 49,
      name: 'Chelsea',
      logo: '',
      position: 10,
      form: ['D', 'L', 'W', 'W', 'D'],
    },
  },
  {
    fixtureId: 6,
    homeTeam: {
      id: 42,
      name: 'Arsenal',
      logo: '',
      position: 1,
      form: ['W', 'W', 'D', 'W', 'W'],
    },
    awayTeam: {
      id: 33,
      name: 'Manchester United',
      logo: '',
      position: 6,
      form: ['W', 'L', 'W', 'D', 'W'],
    },
  },
  {
    fixtureId: 7,
    homeTeam: {
      id: 40,
      name: 'Liverpool',
      logo: '',
      position: 3,
      form: ['W', 'W', 'W', 'W', 'D'],
    },
    awayTeam: {
      id: 48,
      name: 'West Ham',
      logo: '',
      position: 9,
      form: ['D', 'W', 'L', 'W', 'D'],
    },
  },
  {
    fixtureId: 8,
    homeTeam: {
      id: 47,
      name: 'Tottenham',
      logo: '',
      position: 5,
      form: ['W', 'D', 'W', 'L', 'W'],
    },
    awayTeam: {
      id: 36,
      name: 'Brighton',
      logo: '',
      position: 7,
      form: ['D', 'W', 'D', 'W', 'L'],
    },
  },
  {
    fixtureId: 9,
    homeTeam: {
      id: 46,
      name: 'Leicester',
      logo: '',
      position: 14,
      form: ['L', 'D', 'L', 'W', 'D'],
    },
    awayTeam: {
      id: 45,
      name: 'Everton',
      logo: '',
      position: 15,
      form: ['D', 'L', 'D', 'L', 'W'],
    },
  },
  {
    fixtureId: 10,
    homeTeam: {
      id: 39,
      name: 'Wolves',
      logo: '',
      position: 11,
      form: ['W', 'D', 'L', 'D', 'W'],
    },
    awayTeam: {
      id: 38,
      name: 'Aston Villa',
      logo: '',
      position: 8,
      form: ['D', 'W', 'W', 'D', 'L'],
    },
  },
]

// Mock all-time rankings
const mockAllTimeRankings: RankingEntry[] = [
  {
    userId: '1',
    displayName: 'Player One',
    points: 245,
    rank: 1,
    totalPredictions: 50,
    correctPredictions: 38,
    accuracy: 76.0,
  },
  {
    userId: '2',
    displayName: 'Player Two',
    points: 220,
    rank: 2,
    totalPredictions: 48,
    correctPredictions: 33,
    accuracy: 68.8,
  },
  {
    userId: '3',
    displayName: 'Player Three',
    points: 198,
    rank: 3,
    totalPredictions: 45,
    correctPredictions: 30,
    accuracy: 66.7,
  },
  {
    userId: '4',
    displayName: 'Player Four',
    points: 185,
    rank: 4,
    totalPredictions: 42,
    correctPredictions: 28,
    accuracy: 66.7,
  },
  {
    userId: '5',
    displayName: 'Player Five',
    points: 172,
    rank: 5,
    totalPredictions: 40,
    correctPredictions: 26,
    accuracy: 65.0,
  },
  {
    userId: '6',
    displayName: 'Player Six',
    points: 160,
    rank: 6,
    totalPredictions: 38,
    correctPredictions: 24,
    accuracy: 63.2,
  },
  {
    userId: '7',
    displayName: 'Player Seven',
    points: 148,
    rank: 7,
    totalPredictions: 35,
    correctPredictions: 22,
    accuracy: 62.9,
  },
  {
    userId: '8',
    displayName: 'Player Eight',
    points: 135,
    rank: 8,
    totalPredictions: 33,
    correctPredictions: 20,
    accuracy: 60.6,
  },
]

// Mock weekly rankings with match predictions
const mockWeeklyRankings: RankingEntry[] = [
  {
    userId: '1',
    displayName: 'mmmurguia',
    points: 245,
    rank: 1,
    weeklyPoints: 8,
    matchPredictions: [
      { fixtureId: 1, prediction: 'H', homeTeam: mockFixtures[0].homeTeam, awayTeam: mockFixtures[0].awayTeam },
      { fixtureId: 2, prediction: 'H', homeTeam: mockFixtures[1].homeTeam, awayTeam: mockFixtures[1].awayTeam },
      { fixtureId: 3, prediction: 'H', homeTeam: mockFixtures[2].homeTeam, awayTeam: mockFixtures[2].awayTeam },
      { fixtureId: 4, prediction: 'H', homeTeam: mockFixtures[3].homeTeam, awayTeam: mockFixtures[3].awayTeam },
      { fixtureId: 5, prediction: 'H', homeTeam: mockFixtures[4].homeTeam, awayTeam: mockFixtures[4].awayTeam },
      { fixtureId: 6, prediction: 'H', homeTeam: mockFixtures[5].homeTeam, awayTeam: mockFixtures[5].awayTeam },
      { fixtureId: 7, prediction: 'H', homeTeam: mockFixtures[6].homeTeam, awayTeam: mockFixtures[6].awayTeam },
      { fixtureId: 8, prediction: 'H', homeTeam: mockFixtures[7].homeTeam, awayTeam: mockFixtures[7].awayTeam },
      { fixtureId: 9, prediction: 'H', homeTeam: mockFixtures[8].homeTeam, awayTeam: mockFixtures[8].awayTeam },
      { fixtureId: 10, prediction: 'H', homeTeam: mockFixtures[9].homeTeam, awayTeam: mockFixtures[9].awayTeam },
    ],
  },
  {
    userId: '2',
    displayName: 'Player Two',
    points: 220,
    rank: 2,
    weeklyPoints: 7,
    matchPredictions: [
      { fixtureId: 1, prediction: 'H', homeTeam: mockFixtures[0].homeTeam, awayTeam: mockFixtures[0].awayTeam },
      { fixtureId: 2, prediction: 'A', homeTeam: mockFixtures[1].homeTeam, awayTeam: mockFixtures[1].awayTeam },
      { fixtureId: 3, prediction: 'H', homeTeam: mockFixtures[2].homeTeam, awayTeam: mockFixtures[2].awayTeam },
      { fixtureId: 4, prediction: 'D', homeTeam: mockFixtures[3].homeTeam, awayTeam: mockFixtures[3].awayTeam },
      { fixtureId: 5, prediction: 'H', homeTeam: mockFixtures[4].homeTeam, awayTeam: mockFixtures[4].awayTeam },
      { fixtureId: 6, prediction: 'D', homeTeam: mockFixtures[5].homeTeam, awayTeam: mockFixtures[5].awayTeam },
      { fixtureId: 7, prediction: 'H', homeTeam: mockFixtures[6].homeTeam, awayTeam: mockFixtures[6].awayTeam },
      { fixtureId: 8, prediction: 'A', homeTeam: mockFixtures[7].homeTeam, awayTeam: mockFixtures[7].awayTeam },
      { fixtureId: 9, prediction: 'H', homeTeam: mockFixtures[8].homeTeam, awayTeam: mockFixtures[8].awayTeam },
      { fixtureId: 10, prediction: 'D', homeTeam: mockFixtures[9].homeTeam, awayTeam: mockFixtures[9].awayTeam },
    ],
  },
  {
    userId: '3',
    displayName: 'Player Three',
    points: 198,
    rank: 3,
    weeklyPoints: 6,
    matchPredictions: [
      { fixtureId: 1, prediction: 'A', homeTeam: mockFixtures[0].homeTeam, awayTeam: mockFixtures[0].awayTeam },
      { fixtureId: 2, prediction: 'H', homeTeam: mockFixtures[1].homeTeam, awayTeam: mockFixtures[1].awayTeam },
      { fixtureId: 3, prediction: 'H', homeTeam: mockFixtures[2].homeTeam, awayTeam: mockFixtures[2].awayTeam },
      { fixtureId: 4, prediction: 'H', homeTeam: mockFixtures[3].homeTeam, awayTeam: mockFixtures[3].awayTeam },
      { fixtureId: 5, prediction: null, homeTeam: mockFixtures[4].homeTeam, awayTeam: mockFixtures[4].awayTeam },
      { fixtureId: 6, prediction: 'H', homeTeam: mockFixtures[5].homeTeam, awayTeam: mockFixtures[5].awayTeam },
      { fixtureId: 7, prediction: 'D', homeTeam: mockFixtures[6].homeTeam, awayTeam: mockFixtures[6].awayTeam },
      { fixtureId: 8, prediction: 'H', homeTeam: mockFixtures[7].homeTeam, awayTeam: mockFixtures[7].awayTeam },
      { fixtureId: 9, prediction: 'A', homeTeam: mockFixtures[8].homeTeam, awayTeam: mockFixtures[8].awayTeam },
      { fixtureId: 10, prediction: 'H', homeTeam: mockFixtures[9].homeTeam, awayTeam: mockFixtures[9].awayTeam },
    ],
  },
  {
    userId: '4',
    displayName: 'Player Four',
    points: 185,
    rank: 4,
    weeklyPoints: 5,
    matchPredictions: [
      { fixtureId: 1, prediction: 'H', homeTeam: mockFixtures[0].homeTeam, awayTeam: mockFixtures[0].awayTeam },
      { fixtureId: 2, prediction: 'H', homeTeam: mockFixtures[1].homeTeam, awayTeam: mockFixtures[1].awayTeam },
      { fixtureId: 3, prediction: 'D', homeTeam: mockFixtures[2].homeTeam, awayTeam: mockFixtures[2].awayTeam },
      { fixtureId: 4, prediction: null, homeTeam: mockFixtures[3].homeTeam, awayTeam: mockFixtures[3].awayTeam },
      { fixtureId: 5, prediction: 'H', homeTeam: mockFixtures[4].homeTeam, awayTeam: mockFixtures[4].awayTeam },
      { fixtureId: 6, prediction: 'A', homeTeam: mockFixtures[5].homeTeam, awayTeam: mockFixtures[5].awayTeam },
      { fixtureId: 7, prediction: 'H', homeTeam: mockFixtures[6].homeTeam, awayTeam: mockFixtures[6].awayTeam },
      { fixtureId: 8, prediction: 'D', homeTeam: mockFixtures[7].homeTeam, awayTeam: mockFixtures[7].awayTeam },
      { fixtureId: 9, prediction: 'H', homeTeam: mockFixtures[8].homeTeam, awayTeam: mockFixtures[8].awayTeam },
      { fixtureId: 10, prediction: 'H', homeTeam: mockFixtures[9].homeTeam, awayTeam: mockFixtures[9].awayTeam },
    ],
  },
  {
    userId: '5',
    displayName: 'Player Five',
    points: 172,
    rank: 5,
    weeklyPoints: 4,
    matchPredictions: [
      { fixtureId: 1, prediction: 'A', homeTeam: mockFixtures[0].homeTeam, awayTeam: mockFixtures[0].awayTeam },
      { fixtureId: 2, prediction: 'H', homeTeam: mockFixtures[1].homeTeam, awayTeam: mockFixtures[1].awayTeam },
      { fixtureId: 3, prediction: null, homeTeam: mockFixtures[2].homeTeam, awayTeam: mockFixtures[2].awayTeam },
      { fixtureId: 4, prediction: 'H', homeTeam: mockFixtures[3].homeTeam, awayTeam: mockFixtures[3].awayTeam },
      { fixtureId: 5, prediction: 'A', homeTeam: mockFixtures[4].homeTeam, awayTeam: mockFixtures[4].awayTeam },
      { fixtureId: 6, prediction: 'H', homeTeam: mockFixtures[5].homeTeam, awayTeam: mockFixtures[5].awayTeam },
      { fixtureId: 7, prediction: 'H', homeTeam: mockFixtures[6].homeTeam, awayTeam: mockFixtures[6].awayTeam },
      { fixtureId: 8, prediction: 'D', homeTeam: mockFixtures[7].homeTeam, awayTeam: mockFixtures[7].awayTeam },
      { fixtureId: 9, prediction: null, homeTeam: mockFixtures[8].homeTeam, awayTeam: mockFixtures[8].awayTeam },
      { fixtureId: 10, prediction: 'A', homeTeam: mockFixtures[9].homeTeam, awayTeam: mockFixtures[9].awayTeam },
    ],
  },
  {
    userId: '6',
    displayName: 'Player Six',
    points: 160,
    rank: 6,
    weeklyPoints: 3,
    matchPredictions: [
      { fixtureId: 1, prediction: 'H', homeTeam: mockFixtures[0].homeTeam, awayTeam: mockFixtures[0].awayTeam },
      { fixtureId: 2, prediction: 'D', homeTeam: mockFixtures[1].homeTeam, awayTeam: mockFixtures[1].awayTeam },
      { fixtureId: 3, prediction: 'A', homeTeam: mockFixtures[2].homeTeam, awayTeam: mockFixtures[2].awayTeam },
      { fixtureId: 4, prediction: null, homeTeam: mockFixtures[3].homeTeam, awayTeam: mockFixtures[3].awayTeam },
      { fixtureId: 5, prediction: 'H', homeTeam: mockFixtures[4].homeTeam, awayTeam: mockFixtures[4].awayTeam },
      { fixtureId: 6, prediction: 'D', homeTeam: mockFixtures[5].homeTeam, awayTeam: mockFixtures[5].awayTeam },
      { fixtureId: 7, prediction: 'H', homeTeam: mockFixtures[6].homeTeam, awayTeam: mockFixtures[6].awayTeam },
      { fixtureId: 8, prediction: 'H', homeTeam: mockFixtures[7].homeTeam, awayTeam: mockFixtures[7].awayTeam },
      { fixtureId: 9, prediction: 'H', homeTeam: mockFixtures[8].homeTeam, awayTeam: mockFixtures[8].awayTeam },
      { fixtureId: 10, prediction: null, homeTeam: mockFixtures[9].homeTeam, awayTeam: mockFixtures[9].awayTeam },
    ],
  },
  {
    userId: '7',
    displayName: 'Player Seven',
    points: 148,
    rank: 7,
    weeklyPoints: 2,
    matchPredictions: [
      { fixtureId: 1, prediction: null, homeTeam: mockFixtures[0].homeTeam, awayTeam: mockFixtures[0].awayTeam },
      { fixtureId: 2, prediction: 'H', homeTeam: mockFixtures[1].homeTeam, awayTeam: mockFixtures[1].awayTeam },
      { fixtureId: 3, prediction: 'H', homeTeam: mockFixtures[2].homeTeam, awayTeam: mockFixtures[2].awayTeam },
      { fixtureId: 4, prediction: 'A', homeTeam: mockFixtures[3].homeTeam, awayTeam: mockFixtures[3].awayTeam },
      { fixtureId: 5, prediction: 'H', homeTeam: mockFixtures[4].homeTeam, awayTeam: mockFixtures[4].awayTeam },
      { fixtureId: 6, prediction: 'A', homeTeam: mockFixtures[5].homeTeam, awayTeam: mockFixtures[5].awayTeam },
      { fixtureId: 7, prediction: 'D', homeTeam: mockFixtures[6].homeTeam, awayTeam: mockFixtures[6].awayTeam },
      { fixtureId: 8, prediction: null, homeTeam: mockFixtures[7].homeTeam, awayTeam: mockFixtures[7].awayTeam },
      { fixtureId: 9, prediction: 'D', homeTeam: mockFixtures[8].homeTeam, awayTeam: mockFixtures[8].awayTeam },
      { fixtureId: 10, prediction: 'H', homeTeam: mockFixtures[9].homeTeam, awayTeam: mockFixtures[9].awayTeam },
    ],
  },
  {
    userId: '8',
    displayName: 'Player Eight',
    points: 135,
    rank: 8,
    weeklyPoints: 1,
    matchPredictions: [
      { fixtureId: 1, prediction: 'H', homeTeam: mockFixtures[0].homeTeam, awayTeam: mockFixtures[0].awayTeam },
      { fixtureId: 2, prediction: null, homeTeam: mockFixtures[1].homeTeam, awayTeam: mockFixtures[1].awayTeam },
      { fixtureId: 3, prediction: null, homeTeam: mockFixtures[2].homeTeam, awayTeam: mockFixtures[2].awayTeam },
      { fixtureId: 4, prediction: 'H', homeTeam: mockFixtures[3].homeTeam, awayTeam: mockFixtures[3].awayTeam },
      { fixtureId: 5, prediction: null, homeTeam: mockFixtures[4].homeTeam, awayTeam: mockFixtures[4].awayTeam },
      { fixtureId: 6, prediction: 'H', homeTeam: mockFixtures[5].homeTeam, awayTeam: mockFixtures[5].awayTeam },
      { fixtureId: 7, prediction: 'H', homeTeam: mockFixtures[6].homeTeam, awayTeam: mockFixtures[6].awayTeam },
      { fixtureId: 8, prediction: 'A', homeTeam: mockFixtures[7].homeTeam, awayTeam: mockFixtures[7].awayTeam },
      { fixtureId: 9, prediction: 'H', homeTeam: mockFixtures[8].homeTeam, awayTeam: mockFixtures[8].awayTeam },
      { fixtureId: 10, prediction: null, homeTeam: mockFixtures[9].homeTeam, awayTeam: mockFixtures[9].awayTeam },
    ],
  },
  {
    userId: '9',
    displayName: 'Player Nine',
    points: 125,
    rank: 9,
    weeklyPoints: 0,
    matchPredictions: [
      { fixtureId: 1, prediction: null, homeTeam: mockFixtures[0].homeTeam, awayTeam: mockFixtures[0].awayTeam },
      { fixtureId: 2, prediction: null, homeTeam: mockFixtures[1].homeTeam, awayTeam: mockFixtures[1].awayTeam },
      { fixtureId: 3, prediction: null, homeTeam: mockFixtures[2].homeTeam, awayTeam: mockFixtures[2].awayTeam },
      { fixtureId: 4, prediction: null, homeTeam: mockFixtures[3].homeTeam, awayTeam: mockFixtures[3].awayTeam },
      { fixtureId: 5, prediction: null, homeTeam: mockFixtures[4].homeTeam, awayTeam: mockFixtures[4].awayTeam },
      { fixtureId: 6, prediction: null, homeTeam: mockFixtures[5].homeTeam, awayTeam: mockFixtures[5].awayTeam },
      { fixtureId: 7, prediction: null, homeTeam: mockFixtures[6].homeTeam, awayTeam: mockFixtures[6].awayTeam },
      { fixtureId: 8, prediction: null, homeTeam: mockFixtures[7].homeTeam, awayTeam: mockFixtures[7].awayTeam },
      { fixtureId: 9, prediction: null, homeTeam: mockFixtures[8].homeTeam, awayTeam: mockFixtures[8].awayTeam },
      { fixtureId: 10, prediction: null, homeTeam: mockFixtures[9].homeTeam, awayTeam: mockFixtures[9].awayTeam },
    ],
  },
  {
    userId: '10',
    displayName: 'Player Ten',
    points: 115,
    rank: 10,
    weeklyPoints: 0,
    matchPredictions: [
      { fixtureId: 1, prediction: 'A', homeTeam: mockFixtures[0].homeTeam, awayTeam: mockFixtures[0].awayTeam },
      { fixtureId: 2, prediction: 'A', homeTeam: mockFixtures[1].homeTeam, awayTeam: mockFixtures[1].awayTeam },
      { fixtureId: 3, prediction: 'A', homeTeam: mockFixtures[2].homeTeam, awayTeam: mockFixtures[2].awayTeam },
      { fixtureId: 4, prediction: 'A', homeTeam: mockFixtures[3].homeTeam, awayTeam: mockFixtures[3].awayTeam },
      { fixtureId: 5, prediction: 'A', homeTeam: mockFixtures[4].homeTeam, awayTeam: mockFixtures[4].awayTeam },
      { fixtureId: 6, prediction: 'A', homeTeam: mockFixtures[5].homeTeam, awayTeam: mockFixtures[5].awayTeam },
      { fixtureId: 7, prediction: 'A', homeTeam: mockFixtures[6].homeTeam, awayTeam: mockFixtures[6].awayTeam },
      { fixtureId: 8, prediction: 'A', homeTeam: mockFixtures[7].homeTeam, awayTeam: mockFixtures[7].awayTeam },
      { fixtureId: 9, prediction: 'A', homeTeam: mockFixtures[8].homeTeam, awayTeam: mockFixtures[8].awayTeam },
      { fixtureId: 10, prediction: 'A', homeTeam: mockFixtures[9].homeTeam, awayTeam: mockFixtures[9].awayTeam },
    ],
  },
]

// Gameweek ranking data
const mockGameweekRankingData: GameweekRankingData = {
  gameweek: mockGameweek,
  fixtures: mockFixtures,
}

export default function RankingsPage() {
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

  // Show loading state (or nothing) while checking authentication
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

  // TODO: Fetch real data from Firebase
  // 1. Fetch current active gameweek
  // const activeGameweek = await getActiveGameweek()
  // 2. Fetch all fixtures for active gameweek
  // const fixtures = await getGameweekFixtures(activeGameweek.gameweekId)
  // 3. Fetch all user predictions for those fixtures
  // const predictions = await getPredictionsForFixtures(fixtures.map(f => f.fixtureId))
  // 4. Calculate weekly points per user
  // const weeklyRankings = calculateWeeklyRankings(fixtures, predictions)
  // 5. Fetch all-time rankings
  // const allTimeRankings = await getAllTimeRankings()
  // 6. Mark current user
  // const currentUserId = await getCurrentUserId()
  // const rankingsWithUser = [...allTimeRankings, ...weeklyRankings].map(r => ({
  //   ...r,
  //   isCurrentUser: r.userId === currentUserId
  // }))

  return (
    <RankingsClient
      allTimeRankings={mockAllTimeRankings}
      weeklyRankings={mockWeeklyRankings}
      gameweekData={mockGameweekRankingData}
      username={username}
    />
  )
}
