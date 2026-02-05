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
 * Compare two match arrays to see if they're different
 * Only compares key fields that matter for display
 */
function matchesChanged(prev: MatchCardData[], next: MatchCardData[]): boolean {
  if (prev.length !== next.length) return true
  
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i]
    const n = next[i]
    
    if (p.fixtureId !== n.fixtureId) return true
    if (p.matchStatus !== n.matchStatus) return true
    if (p.minute !== n.minute) return true
    if (p.score?.home !== n.score?.home || p.score?.away !== n.score?.away) return true
    
    // Check if user prediction changed
    const pPred = p.userPrediction
    const nPred = n.userPrediction
    if (pPred !== nPred) return true
  }
  
  return false
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
  const initialMatchesRef = useRef<MatchCardData[]>(initialMatches)
  const lastUpdateTimeRef = useRef<number>(0)
  const pendingUpdateRef = useRef<MatchCardData[] | null>(null)
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentMatchesRef = useRef<MatchCardData[]>(initialMatches)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const listenerErrorRef = useRef<Error | null>(null)
  const MAX_RETRIES = 3
  
  // Throttle delay: 100ms minimum between updates
  const THROTTLE_MS = 100

  // Update ref when initialMatches changes (without causing re-subscriptions)
  useEffect(() => {
    initialMatchesRef.current = initialMatches
  }, [initialMatches])

  // Store team positions, forms, and user predictions from initial matches
  useEffect(() => {
    const positions = new Map<number, number>()
    const forms = new Map<number, FormResult[]>()
    const predictions = new Map<number, Prediction>()

    initialMatches.forEach((match) => {
      // Only store position if it's not 0 (0 means no position data)
      if (match.homeTeam.position > 0) {
        positions.set(match.homeTeam.id, match.homeTeam.position)
      }
      if (match.awayTeam.position > 0) {
        positions.set(match.awayTeam.id, match.awayTeam.position)
      }
      // Only store form if it has data
      if (match.homeTeam.form && match.homeTeam.form.length > 0) {
        forms.set(match.homeTeam.id, match.homeTeam.form)
      }
      if (match.awayTeam.form && match.awayTeam.form.length > 0) {
        forms.set(match.awayTeam.id, match.awayTeam.form)
      }
      if (match.userPrediction) {
        predictions.set(match.fixtureId, match.userPrediction)
      }
    })

    teamPositionsRef.current = positions
    teamFormsRef.current = forms
    userPredictionsRef.current = predictions
    
    // If we have an active listener and initialMatches has data, trigger a re-conversion
    // by updating the matches state with the current matches but using the updated refs
    if (gameweekId && initialMatches.length > 0 && currentMatchesRef.current.length > 0) {
      // Re-convert current matches with updated refs
      const reConvertedMatches = currentMatchesRef.current.map((match) => {
        const homePosition = teamPositionsRef.current.get(match.homeTeam.id) || match.homeTeam.position
        const homeForm = teamFormsRef.current.get(match.homeTeam.id) || match.homeTeam.form
        const awayPosition = teamPositionsRef.current.get(match.awayTeam.id) || match.awayTeam.position
        const awayForm = teamFormsRef.current.get(match.awayTeam.id) || match.awayTeam.form
        
        return {
          ...match,
          homeTeam: {
            ...match.homeTeam,
            position: homePosition,
            form: homeForm,
          },
          awayTeam: {
            ...match.awayTeam,
            position: awayPosition,
            form: awayForm,
          },
        }
      })
      
      // Only update if positions/forms actually changed
      const hasChanges = reConvertedMatches.some((match, i) => {
        const original = currentMatchesRef.current[i]
        return (
          match.homeTeam.position !== original.homeTeam.position ||
          match.awayTeam.position !== original.awayTeam.position ||
          JSON.stringify(match.homeTeam.form) !== JSON.stringify(original.homeTeam.form) ||
          JSON.stringify(match.awayTeam.form) !== JSON.stringify(original.awayTeam.form)
        )
      })
      
      if (hasChanges) {
        currentMatchesRef.current = reConvertedMatches
        setMatches(reConvertedMatches)
      }
    }
  }, [initialMatches, gameweekId])

  // Update matches state when initialMatches changes and we don't have a listener
  useEffect(() => {
    // Only update if we don't have a gameweekId (no active listener)
    // When gameweekId exists, the listener will handle updates
    if (!gameweekId) {
      currentMatchesRef.current = initialMatchesRef.current
      setMatches(initialMatchesRef.current)
    }
  }, [initialMatches, gameweekId])

  // Set up Firestore listener - only re-run when gameweekId changes
  useEffect(() => {
    // Don't set up listener if no gameweek ID
    if (!gameweekId) {
      currentMatchesRef.current = initialMatchesRef.current
      setMatches(initialMatchesRef.current)
      return
    }

    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    // Populate refs from initialMatches BEFORE setting up listener
    // This ensures refs are ready when the listener fires immediately
    const positions = new Map<number, number>()
    const forms = new Map<number, FormResult[]>()
    const predictions = new Map<number, Prediction>()

    initialMatchesRef.current.forEach((match) => {
      if (match.homeTeam.position > 0) {
        positions.set(match.homeTeam.id, match.homeTeam.position)
      }
      if (match.awayTeam.position > 0) {
        positions.set(match.awayTeam.id, match.awayTeam.position)
      }
      if (match.homeTeam.form && match.homeTeam.form.length > 0) {
        forms.set(match.homeTeam.id, match.homeTeam.form)
      }
      if (match.awayTeam.form && match.awayTeam.form.length > 0) {
        forms.set(match.awayTeam.id, match.awayTeam.form)
      }
      if (match.userPrediction) {
        predictions.set(match.fixtureId, match.userPrediction)
      }
    })

    teamPositionsRef.current = positions
    teamFormsRef.current = forms
    userPredictionsRef.current = predictions

    // Set initial matches immediately while listener is being set up
    // This ensures we show data right away, then the listener will update it
    currentMatchesRef.current = initialMatchesRef.current
    setMatches(initialMatchesRef.current)

    try {
      // Set up listener on fixtures subcollection
      const fixturesRef = collection(db, 'gameweeks', gameweekId, 'fixtures')
      const fixturesQuery = query(fixturesRef)

      const unsubscribe = onSnapshot(
        fixturesQuery,
        (snapshot) => {
          // Always sync refs from initialMatches at the start of each callback
          // This ensures we have the latest position/form data even if initialMatches
          // was updated after the listener was set up
          const positions = new Map<number, number>()
          const forms = new Map<number, FormResult[]>()
          const predictions = new Map<number, Prediction>()

          initialMatchesRef.current.forEach((match) => {
            if (match.homeTeam.position > 0) {
              positions.set(match.homeTeam.id, match.homeTeam.position)
            }
            if (match.awayTeam.position > 0) {
              positions.set(match.awayTeam.id, match.awayTeam.position)
            }
            if (match.homeTeam.form && match.homeTeam.form.length > 0) {
              forms.set(match.homeTeam.id, match.homeTeam.form)
            }
            if (match.awayTeam.form && match.awayTeam.form.length > 0) {
              forms.set(match.awayTeam.id, match.awayTeam.form)
            }
            if (match.userPrediction) {
              predictions.set(match.fixtureId, match.userPrediction)
            }
          })

          teamPositionsRef.current = positions
          teamFormsRef.current = forms
          userPredictionsRef.current = predictions
          
          const updatedFixtures: GameweekFixtureData[] = []
          
          snapshot.forEach((doc) => {
            const data = doc.data()
            updatedFixtures.push(data as GameweekFixtureData)
          })

          // Convert to MatchCardData format, preserving team positions and forms
          const convertedMatches = updatedFixtures.map((fixtureData) => {
            const homeId = fixtureData.teams.home.id
            const awayId = fixtureData.teams.away.id
            const homeHasPosition = teamPositionsRef.current.has(homeId)
            const awayHasPosition = teamPositionsRef.current.has(awayId)
            const homeHasForm = teamFormsRef.current.has(homeId)
            const awayHasForm = teamFormsRef.current.has(awayId)
            
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

          // Throttle updates to prevent rapid re-renders
          const now = Date.now()
          const timeSinceLastUpdate = now - lastUpdateTimeRef.current
          
          // Clear any pending timeout
          if (throttleTimeoutRef.current) {
            clearTimeout(throttleTimeoutRef.current)
            throttleTimeoutRef.current = null
          }
          
          // Store the pending update
          pendingUpdateRef.current = sortedMatches
          
          // Check if matches actually changed before updating
          if (!matchesChanged(currentMatchesRef.current, sortedMatches)) {
            // No changes, skip update
            pendingUpdateRef.current = null
            return
          }
          
          // If enough time has passed, update immediately
          if (timeSinceLastUpdate >= THROTTLE_MS) {
            currentMatchesRef.current = sortedMatches
            setMatches(sortedMatches)
            lastUpdateTimeRef.current = now
            pendingUpdateRef.current = null
          } else {
            // Schedule update after throttle delay
            throttleTimeoutRef.current = setTimeout(() => {
              const pending = pendingUpdateRef.current
              if (pending && matchesChanged(currentMatchesRef.current, pending)) {
                currentMatchesRef.current = pending
                setMatches(pending)
                lastUpdateTimeRef.current = Date.now()
              }
              pendingUpdateRef.current = null
              throttleTimeoutRef.current = null
            }, THROTTLE_MS - timeSinceLastUpdate)
          }
        },
        (error) => {
          console.error('Error listening to fixtures:', error)
          
          // Reset retry count on successful listener setup
          retryCountRef.current = 0
          listenerErrorRef.current = null
          
          // Keep showing initial matches on error
          currentMatchesRef.current = initialMatchesRef.current
          setMatches(initialMatchesRef.current)
          
          // Retry logic with exponential backoff
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++
            listenerErrorRef.current = new Error(`Connection issue (retry ${retryCountRef.current}/${MAX_RETRIES})`)
            
            retryTimeoutRef.current = setTimeout(() => {
              // Retry listener setup by cleaning up and letting useEffect re-run
              if (unsubscribeRef.current) {
                unsubscribeRef.current()
                unsubscribeRef.current = null
              }
              // Trigger re-subscription by updating a ref or state
              // The listener will be recreated on next render
            }, 2000 * retryCountRef.current) // Exponential backoff
          } else {
            listenerErrorRef.current = new Error('Failed to connect to live updates after multiple retries')
          }
        }
      )

      unsubscribeRef.current = unsubscribe
    } catch (error) {
      console.error('Error setting up fixtures listener:', error)
      // Keep showing initial matches on error
      currentMatchesRef.current = initialMatchesRef.current
      setMatches(initialMatchesRef.current)
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      // Clear any pending throttle timeout
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current)
        throttleTimeoutRef.current = null
      }
      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      pendingUpdateRef.current = null
    }
  }, [gameweekId]) // Removed initialMatches from dependencies to prevent re-subscriptions

  return matches
}