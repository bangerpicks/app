import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'

/**
 * API-Football Fixture interface
 */
interface APIFootballFixture {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    venue: {
      id: number | null
      name: string
      city: string
    }
    status: {
      long: string
      short: string
      elapsed: number | null
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string | null
    season: number
    round: string
  }
  teams: {
    home: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
    away: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: {
      home: number | null
      away: number | null
    }
    fulltime: {
      home: number | null
      away: number | null
    }
    extratime: {
      home: number | null
      away: number | null
    }
    penalty: {
      home: number | null
      away: number | null
    }
  }
}

/**
 * Get API key from Firebase config or environment variables
 */
function getApiKey(): string {
  // Try Firebase config first (recommended for v1 functions)
  const configKey = functions.config().api_football?.key
  if (configKey) {
    return configKey
  }
  
  // Fallback to environment variable (useful for local testing)
  const envKey = process.env.API_FOOTBALL_KEY
  if (envKey) {
    return envKey
  }
  
  throw new Error(
    'API_FOOTBALL_KEY not configured. ' +
    'Please set it using: firebase functions:config:set api_football.key="your-api-key" ' +
    'Then redeploy: firebase deploy --only functions:updateLiveFixtures'
  )
}

/**
 * Check if a match status indicates the match is finished
 */
function isMatchFinished(status: string): boolean {
  return status === 'FT' || status === 'AET' || status === 'PEN'
}

/**
 * Determine match winner from fixture results
 * Returns 'H' for home win, 'D' for draw, 'A' for away win, or null if match not finished
 */
function determineMatchWinner(fixture: APIFootballFixture): 'H' | 'D' | 'A' | null {
  const status = fixture.fixture.status.short
  if (status !== 'FT' && status !== 'AET' && status !== 'PEN') {
    return null // Match not finished
  }

  const homeGoals = fixture.goals.home ?? 0
  const awayGoals = fixture.goals.away ?? 0

  if (homeGoals > awayGoals) return 'H'
  if (homeGoals < awayGoals) return 'A'
  return 'D' // Draw
}

/**
 * Fetch fixtures from API-Football
 */
async function fetchFixturesByIds(fixtureIds: number[]): Promise<APIFootballFixture[]> {
  if (fixtureIds.length === 0) {
    return []
  }

  const apiKey = getApiKey()
  const ids = fixtureIds.join('-')
  const url = `${API_FOOTBALL_BASE_URL}/fixtures?ids=${ids}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-apisports-key': apiKey,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API-Football request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()

  // Check for API errors
  if (data.errors) {
    const errorKeys = Object.keys(data.errors)
    if (errorKeys.length > 0) {
      const errorMessages = errorKeys.map((key) => `${key}: ${data.errors[key]}`).join(', ')
      throw new Error(`API-Football errors: ${errorMessages}`)
    }
  }

  return data.response || []
}

/**
 * Update live fixtures for all active gameweeks
 */
export const updateLiveFixtures = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const db = admin.firestore()

    try {
      // Query all active gameweeks
      const gameweeksSnapshot = await db
        .collection('gameweeks')
        .where('status', '==', 'active')
        .get()

      if (gameweeksSnapshot.empty) {
        return null
      }

      // Process each active gameweek
      for (const gameweekDoc of gameweeksSnapshot.docs) {
        const gameweekId = gameweekDoc.id

        try {
          // Get all fixtures for this gameweek
          const fixturesSnapshot = await db
            .collection('gameweeks')
            .doc(gameweekId)
            .collection('fixtures')
            .get()

          if (fixturesSnapshot.empty) {
            continue
          }

          // Get fixture IDs
          const fixtureIds: number[] = []
          const fixtureDocs = fixturesSnapshot.docs

          for (const fixtureDoc of fixtureDocs) {
            const fixtureData = fixtureDoc.data()
            if (fixtureData.fixtureId) {
              fixtureIds.push(fixtureData.fixtureId)
            }
          }

          if (fixtureIds.length === 0) {
            continue
          }

          // Fetch updated fixtures from API-Football
          const updatedFixtures = await fetchFixturesByIds(fixtureIds)

          // Create a map of fixture ID to updated fixture data
          const fixtureMap = new Map<number, APIFootballFixture>()
          for (const fixture of updatedFixtures) {
            fixtureMap.set(fixture.fixture.id, fixture)
          }

          // Update fixture documents in Firestore
          const batch = db.batch()
          let updateCount = 0

          for (const fixtureDoc of fixtureDocs) {
            const fixtureData = fixtureDoc.data()
            const fixtureId = fixtureData.fixtureId

            // Get updated fixture data
            const updatedFixture = fixtureMap.get(fixtureId)
            if (!updatedFixture) {
              continue
            }

            // Check if match is finished
            const status = updatedFixture.fixture.status.short
            const isFinished = isMatchFinished(status)
            
            // Check current status in Firestore to see if we need to update
            const currentFixture = fixtureData.fixture as APIFootballFixture | undefined
            const currentStatus = currentFixture?.fixture?.status?.short
            
            // Skip if match is finished AND already updated to finished status
            // This prevents unnecessary updates but still allows the final status update
            if (isFinished && currentStatus === status) {
              continue
            }

            // Update only the fixture field (preserve other fields)
            const fixtureRef = db
              .collection('gameweeks')
              .doc(gameweekId)
              .collection('fixtures')
              .doc(fixtureDoc.id)

            batch.update(fixtureRef, {
              fixture: updatedFixture,
            })

            updateCount++
          }

          // Commit batch update
          if (updateCount > 0) {
            await batch.commit()
          }
        } catch (error: any) {
          console.error(`[updateLiveFixtures] Error processing gameweek ${gameweekId}:`, error)
          // Continue with next gameweek instead of failing completely
        }
      }

      return null
    } catch (error: any) {
      console.error('[updateLiveFixtures] Error in live fixture update:', error)
      throw error
    }
  })

/**
 * Auto-scoring function that awards points for finished matches
 * Runs every 5 minutes to check finished matches and award points
 */
export const autoScoring = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const db = admin.firestore()

    try {
      // Query all active gameweeks
      const gameweeksSnapshot = await db
        .collection('gameweeks')
        .where('status', '==', 'active')
        .get()

      if (gameweeksSnapshot.empty) {
        return null
      }

      let totalAwarded = 0
      let totalProcessed = 0

      // Process each active gameweek
      for (const gameweekDoc of gameweeksSnapshot.docs) {
        const gameweekId = gameweekDoc.id

        try {
          // Get all fixtures for this gameweek
          const fixturesSnapshot = await db
            .collection('gameweeks')
            .doc(gameweekId)
            .collection('fixtures')
            .get()

          if (fixturesSnapshot.empty) {
            continue
          }

          // Get fixture IDs and filter finished fixtures
          const finishedFixtureIds: number[] = []
          const fixtureMap = new Map<number, admin.firestore.DocumentSnapshot>()

          for (const fixtureDoc of fixturesSnapshot.docs) {
            const fixtureData = fixtureDoc.data()
            const fixtureId = fixtureData.fixtureId
            if (!fixtureId) continue

            // Check if fixture is finished using cached fixture data
            const cachedFixture = fixtureData.fixture as APIFootballFixture | undefined
            if (cachedFixture) {
              const status = cachedFixture.fixture.status.short
              if (isMatchFinished(status)) {
                finishedFixtureIds.push(fixtureId)
                fixtureMap.set(fixtureId, fixtureDoc)
              }
            }
          }

          if (finishedFixtureIds.length === 0) {
            continue
          }

          // Fetch latest fixture results from API-Football
          const updatedFixtures = await fetchFixturesByIds(finishedFixtureIds)
          const fixtureResultsMap = new Map<number, APIFootballFixture>()
          for (const fixture of updatedFixtures) {
            fixtureResultsMap.set(fixture.fixture.id, fixture)
          }

          // Process each finished fixture
          for (const fixtureId of finishedFixtureIds) {
            const fixtureResult = fixtureResultsMap.get(fixtureId)
            if (!fixtureResult) {
              continue
            }

            // Determine match winner
            const winner = determineMatchWinner(fixtureResult)
            if (!winner) {
              continue
            }

            try {
              // Get all prediction entries for this fixture
              const predictionsRef = db
                .collection('predictions')
                .doc(String(fixtureId))
                .collection('entries')

              const predictionsSnapshot = await predictionsRef.get()

              if (predictionsSnapshot.empty) {
                continue
              }

              // Batch updates for this fixture
              const batch = db.batch()
              let batchCount = 0
              const maxBatchSize = 500 // Firestore batch limit

              // Track user stats updates (we'll update these separately)
              const userStatsUpdates = new Map<
                string,
                { pointsIncrement: number; correctIncrement: number; totalIncrement: number }
              >()

              for (const predictionDoc of predictionsSnapshot.docs) {
                const prediction = predictionDoc.data()

                // Skip if already awarded
                if (prediction.awarded === true) {
                  continue
                }

                const uid = prediction.uid || predictionDoc.id
                const pick = prediction.pick

                if (!pick || (pick !== 'H' && pick !== 'D' && pick !== 'A')) {
                  continue
                }

                // Compare prediction with actual result
                const isCorrect = pick === winner
                const points = isCorrect ? 1 : 0

                // Update prediction entry
                const predictionRef = db
                  .collection('predictions')
                  .doc(String(fixtureId))
                  .collection('entries')
                  .doc(predictionDoc.id)

                batch.update(predictionRef, {
                  awarded: true,
                  points: points,
                  correct: isCorrect,
                  status: fixtureResult.fixture.status.short,
                  result:
                    fixtureResult.goals.home !== null && fixtureResult.goals.away !== null
                      ? {
                          homeGoals: fixtureResult.goals.home,
                          awayGoals: fixtureResult.goals.away,
                        }
                      : null,
                })

                batchCount++

                // Track user stats updates
                if (!userStatsUpdates.has(uid)) {
                  userStatsUpdates.set(uid, {
                    pointsIncrement: 0,
                    correctIncrement: 0,
                    totalIncrement: 0,
                  })
                }

                const stats = userStatsUpdates.get(uid)!
                stats.totalIncrement += 1
                if (isCorrect) {
                  stats.correctIncrement += 1
                  stats.pointsIncrement += 1
                }

                // Commit batch if we're approaching the limit
                if (batchCount >= maxBatchSize) {
                  await batch.commit()
                  totalProcessed += batchCount
                  batchCount = 0
                }
              }

              // Commit remaining predictions in batch
              if (batchCount > 0) {
                await batch.commit()
                totalProcessed += batchCount
              }

              // Update user documents with points and stats
              // Use transactions to ensure atomic updates for user stats
              for (const [uid, stats] of userStatsUpdates.entries()) {
                try {
                  await db.runTransaction(async (transaction) => {
                    const userRef = db.collection('users').doc(uid)
                    const userDoc = await transaction.get(userRef)

                    if (!userDoc.exists) {
                      return
                    }

                    const currentData = userDoc.data()
                    const currentTotal = (currentData?.totalPredictions || 0) + stats.totalIncrement
                    const currentCorrect = (currentData?.correctPredictions || 0) + stats.correctIncrement
                    const accuracy = currentTotal > 0 ? Math.round((currentCorrect / currentTotal) * 100) : 0

                    // Use increment for points (atomic operation)
                    // Update total/correct predictions and accuracy (calculated values)
                    transaction.update(userRef, {
                      points: admin.firestore.FieldValue.increment(stats.pointsIncrement),
                      totalPredictions: currentTotal,
                      correctPredictions: currentCorrect,
                      accuracy: accuracy,
                    })
                  })

                  if (stats.pointsIncrement > 0) {
                    totalAwarded += stats.pointsIncrement
                  }
                } catch (error: any) {
                  console.error(`[autoScoring] Error updating user ${uid}:`, error)
                  // Continue with other users even if one fails
                }
              }
            } catch (error: any) {
              console.error(`[autoScoring] Error processing fixture ${fixtureId}:`, error)
              // Continue with next fixture
            }
          }
        } catch (error: any) {
          console.error(`[autoScoring] Error processing gameweek ${gameweekId}:`, error)
          // Continue with next gameweek
        }
      }

      return null
    } catch (error: any) {
      console.error('[autoScoring] Error in auto-scoring:', error)
      throw error
    }
  })