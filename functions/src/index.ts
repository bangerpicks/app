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

/** Weekly placement bonus multipliers: 1st +50%, 2nd +30%, 3rd +20% of that week's points */
const BONUS_MULTIPLIERS = [0.5, 0.3, 0.2] as const

/**
 * When a gameweek is marked completed, compute weekly rankings for that gameweek,
 * apply placement bonuses to top 3 (×1.5, ×1.3, ×1.2), and update user docs.
 */
export const onGameweekUpdate = functions.firestore
  .document('gameweeks/{gameweekId}')
  .onUpdate(async (change, context) => {
    const db = admin.firestore()
    const gameweekId = context.params.gameweekId as string
    const before = change.before.data()
    const after = change.after.data()

    const prevStatus = before?.status
    const newStatus = after?.status

    if (newStatus !== 'completed' || prevStatus === 'completed') {
      return null
    }

    const fixtureIds: number[] = after?.fixtureIds || []
    if (fixtureIds.length === 0) {
      return null
    }

    try {
      // Aggregate weekly points per user from predictions (awarded points only)
      const weeklyPointsByUid = new Map<string, number>()

      for (const fixtureId of fixtureIds) {
        const entriesSnapshot = await db
          .collection('predictions')
          .doc(String(fixtureId))
          .collection('entries')
          .get()

        entriesSnapshot.docs.forEach((docSnap) => {
          const data = docSnap.data()
          const uid = data.uid || docSnap.id
          if (data.awarded === true && typeof data.points === 'number') {
            const current = weeklyPointsByUid.get(uid) || 0
            weeklyPointsByUid.set(uid, current + data.points)
          }
        })
      }

      // Build sorted array and assign ranks (tie handling)
      const entries: { uid: string; weeklyPoints: number }[] = []
      weeklyPointsByUid.forEach((weeklyPoints, uid) => {
        entries.push({ uid, weeklyPoints })
      })
      entries.sort((a, b) => b.weeklyPoints - a.weeklyPoints)

      let currentRank = 1
      let previousPoints: number | null = null
      let usersAtCurrentRank = 0
      const rankByUid = new Map<string, number>()

      entries.forEach(({ uid, weeklyPoints }) => {
        if (previousPoints === null) {
          currentRank = 1
          usersAtCurrentRank = 1
        } else if (weeklyPoints < previousPoints) {
          currentRank += usersAtCurrentRank
          usersAtCurrentRank = 1
        } else {
          usersAtCurrentRank++
        }
        rankByUid.set(uid, currentRank)
        previousPoints = weeklyPoints
      })

      // Top 3 by rank (rank 1, 2, 3) get bonuses
      const podium: { uid: string; rank: 1 | 2 | 3; weeklyPoints: number }[] = []
      entries.forEach(({ uid, weeklyPoints }) => {
        const rank = rankByUid.get(uid)
        if (rank === 1 || rank === 2 || rank === 3) {
          podium.push({ uid, rank: rank as 1 | 2 | 3, weeklyPoints })
        }
      })

      for (const { uid, rank, weeklyPoints } of podium) {
        const bonusFraction = BONUS_MULTIPLIERS[rank - 1]
        const bonus = Math.round(weeklyPoints * bonusFraction)

        const userRef = db.collection('users').doc(uid)
        const updates: Record<string, unknown> = {
          points: admin.firestore.FieldValue.increment(bonus),
          lastWeekPlace: rank,
          lastCompletedGameweekId: gameweekId,
        }
        if (rank === 1) {
          updates.weekWins1st = admin.firestore.FieldValue.increment(1)
        } else if (rank === 2) {
          updates.weekWins2nd = admin.firestore.FieldValue.increment(1)
        } else {
          updates.weekWins3rd = admin.firestore.FieldValue.increment(1)
        }

        await userRef.update(updates)
      }

      return null
    } catch (error: any) {
      console.error(`[onGameweekUpdate] Error processing gameweek ${gameweekId}:`, error)
      throw error
    }
  })

/**
 * Callable function to track a referral signup and award 5 points to the referrer.
 * Runs with admin privileges to create referrals docs and update the referrer's user doc.
 * Only the newly signed-up user (authenticated caller) can trigger this.
 */
export const trackReferralSignup = functions.https.onCall(async (data: { referralCode?: string }, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in to process referral')
  }

  const referralCode = typeof data?.referralCode === 'string' ? data.referralCode.trim() : ''
  if (!referralCode) {
    throw new functions.https.HttpsError('invalid-argument', 'referralCode is required')
  }

  const trimmedCode = referralCode.toUpperCase()
  const newUserUid = context.auth.uid
  const db = admin.firestore()

  try {
    // Validate referral code and get referrer UID
    const usersSnapshot = await db.collection('users').where('referralCode', '==', trimmedCode).limit(1).get()
    if (usersSnapshot.empty) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid referral code')
    }

    const referrerDoc = usersSnapshot.docs[0]
    const referrerUid = referrerDoc.id

    // Prevent self-referral
    if (referrerUid === newUserUid) {
      throw new functions.https.HttpsError('invalid-argument', 'Self-referral is not allowed')
    }

    // Check if referral already exists
    const existingSnapshot = await db
      .collection('referrals')
      .where('referrerUid', '==', referrerUid)
      .where('referredUid', '==', newUserUid)
      .limit(1)
      .get()

    if (!existingSnapshot.empty) {
      throw new functions.https.HttpsError('already-exists', 'Referral already exists')
    }

    // Create referral document
    await db.collection('referrals').add({
      referrerUid,
      referredUid: newUserUid,
      referralCode: trimmedCode,
      status: 'completed',
      pointsAwarded: 5,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Award 5 referral points to the referrer (atomic increment)
    await db.collection('users').doc(referrerUid).update({
      referralPoints: admin.firestore.FieldValue.increment(5),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    console.error('[trackReferralSignup] Error:', error)
    throw new functions.https.HttpsError('internal', 'Failed to process referral')
  }
})