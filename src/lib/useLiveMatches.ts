'use client'

import { useEffect, useState, useRef } from 'react'
import { collection, onSnapshot, query, Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import { MatchCardData, Prediction } from '@/types/dashboard'
import { GameweekFixtureData } from '@/lib/admin'
import { FormResult } from '@/types/dashboard'

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
 * Convert GameweekFixtureData to MatchCardData, preserving team positions and forms
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
    matchStatus = 'LIVE' // Live match
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

/**
 * Custom hook for live match updates using Firestore real-time listeners
 * Listens to fixture updates in Firestore (updated by Cloud Function)
 */
export function useLiveMatches(
  gameweekId: string | null,
  initialMatches: MatchCardData[]
): MatchCardData[] {
  const [matches, setMatches] = useState<MatchCardData[]>(initialMatches)
  const unsubscribeRef = useRef<Unsubscribe | null>(null)
  const teamPositionsRef = useRef(new Map<number, number>())
  const teamFormsRef = useRef(new Map<number, FormResult[]>())
  const userPredictionsRef = useRef(new Map<number, Prediction>())

  // Store team positions, forms, and user predictions from initial matches
  useEffect(() => {
    const positions = new Map<number, number>()
    const forms = new Map<number, FormResult[]>()
    const predictions = new Map<number, Prediction>()

    initialMatches.forEach((match) => {
      positions.set(match.homeTeam.id, match.homeTeam.position)
      positions.set(match.awayTeam.id, match.awayTeam.position)
      forms.set(match.homeTeam.id, match.homeTeam.form)
      forms.set(match.awayTeam.id, match.awayTeam.form)
      if (match.userPrediction) {
        predictions.set(match.fixtureId, match.userPrediction)
      }
    })

    teamPositionsRef.current = positions
    teamFormsRef.current = forms
    userPredictionsRef.current = predictions
  }, [initialMatches])

  // Set up Firestore listener
  useEffect(() => {
    // Don't set up listener if no gameweek ID
    if (!gameweekId) {
      setMatches(initialMatches)
      return
    }

    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    try {
      // Set up listener on fixtures subcollection
      const fixturesRef = collection(db, 'gameweeks', gameweekId, 'fixtures')
      const fixturesQuery = query(fixturesRef)

      const unsubscribe = onSnapshot(
        fixturesQuery,
        (snapshot) => {
          const updatedFixtures: GameweekFixtureData[] = []
          
          snapshot.forEach((doc) => {
            const data = doc.data()
            updatedFixtures.push(data as GameweekFixtureData)
          })

          // Convert to MatchCardData format, preserving team positions and forms
          const convertedMatches = updatedFixtures.map((fixtureData) => {
            const match = convertFixtureToMatchCard(fixtureData, teamPositionsRef.current, teamFormsRef.current)
            // Merge back user predictions from initial matches
            const userPrediction = userPredictionsRef.current.get(match.fixtureId)
            return {
              ...match,
              userPrediction: userPrediction || null,
            }
          })

          // Sort matches by start time (date)
          const sortedMatches = convertedMatches.sort((a, b) => 
            a.date.getTime() - b.date.getTime()
          )

          setMatches(sortedMatches)
        },
        (error) => {
          console.error('Error listening to fixtures:', error)
          // Keep showing initial matches on error
          setMatches(initialMatches)
        }
      )

      unsubscribeRef.current = unsubscribe
    } catch (error) {
      console.error('Error setting up fixtures listener:', error)
      // Keep showing initial matches on error
      setMatches(initialMatches)
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [gameweekId, initialMatches])

  return matches
}