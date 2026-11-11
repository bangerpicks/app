import * as functions from 'firebase-functions'
import { defineSecret } from 'firebase-functions/params'
import * as admin from 'firebase-admin'
import {
  fetchFixturesByIdsBatched,
  ApiFootballRateLimitError,
  resetApiFootballRateLimitWarning,
  logApiFootballRateLimitWarning,
} from './api-football-client'
import type { APIFootballFixture } from './api-football-types'
import {
  extractFixturePollContext,
  fixtureNeedsLiveApiPoll,
  fixtureNeedsScoringApiPoll,
  isMatchFinished,
} from './fixture-window'
import { isUserAdmin } from './admin-auth'
import { adminGetStandings, adminSearchFixtures, adminSearchPlayers } from './admin-api-football-handlers'

admin.initializeApp()

const apiFootballKey = defineSecret('API_FOOTBALL_KEY')

const scheduledOpts = { secrets: [apiFootballKey] }

/**
 * Resolve API-Football key: Secret Manager in production, env for emulator/local.
 */
function resolveApiFootballKey(): string {
  try {
    const secretValue = apiFootballKey.value()
    if (secretValue) {
      return secretValue
    }
  } catch {
    // Secret not available (e.g. local shell without binding)
  }

  const envKey = process.env.API_FOOTBALL_KEY
  if (envKey) {
    return envKey
  }

  const legacyConfigKey = functions.config().api_football?.key
  if (legacyConfigKey) {
    return legacyConfigKey
  }

  throw new Error(
    'API_FOOTBALL_KEY not configured. Run: firebase functions:secrets:set API_FOOTBALL_KEY, then redeploy functions.'
  )
}

/**
 * Determine match winner from fixture results
 */
function determineMatchWinner(fixture: APIFootballFixture): 'H' | 'D' | 'A' | null {
  const status = fixture.fixture.status.short
  if (status !== 'FT' && status !== 'AET' && status !== 'PEN') {
    return null
  }

  const homeGoals = fixture.goals.home ?? 0
  const awayGoals = fixture.goals.away ?? 0

  if (homeGoals > awayGoals) return 'H'
  if (homeGoals < awayGoals) return 'A'
  return 'D'
}

async function fixtureHasUnawardedPredictions(db: admin.firestore.Firestore, fixtureId: number): Promise<boolean> {
  const predictionsSnapshot = await db
    .collection('predictions')
    .doc(String(fixtureId))
    .collection('entries')
    .limit(50)
    .get()

  if (predictionsSnapshot.empty) {
    return false
  }

  for (const doc of predictionsSnapshot.docs) {
    const data = doc.data()
    if (data.awarded !== true && data.pick && (data.pick === 'H' || data.pick === 'D' || data.pick === 'A')) {
      return true
    }
  }

  if (predictionsSnapshot.size >= 50) {
    const unawarded = await db
      .collection('predictions')
      .doc(String(fixtureId))
      .collection('entries')
      .where('awarded', '==', false)
      .limit(1)
      .get()
    return !unawarded.empty
  }

  return false
}

/**
 * Update live fixtures for all active gameweeks (every 2 minutes).
 */
export const updateLiveFixtures = functions
  .runWith(scheduledOpts)
  .pubsub.schedule('every 2 minutes')
  .onRun(async () => {
    resetApiFootballRateLimitWarning()
    const db = admin.firestore()
    let apiKey: string

    try {
      apiKey = resolveApiFootballKey()
    } catch (error: unknown) {
      console.error('[updateLiveFixtures]', error instanceof Error ? error.message : error)
      return null
    }

    try {
      const gameweeksSnapshot = await db.collection('gameweeks').where('status', '==', 'active').get()

      if (gameweeksSnapshot.empty) {
        console.log('[updateLiveFixtures] No active gameweeks; exiting with 0 API calls')
        return null
      }

      for (const gameweekDoc of gameweeksSnapshot.docs) {
        const gameweekId = gameweekDoc.id

        try {
          const fixturesSnapshot = await db.collection('gameweeks').doc(gameweekId).collection('fixtures').get()

          if (fixturesSnapshot.empty) {
            continue
          }

          const fixtureDocs = fixturesSnapshot.docs
          const idsToFetch: number[] = []

          for (const fixtureDoc of fixtureDocs) {
            const fixtureData = fixtureDoc.data()
            const fixtureId = fixtureData.fixtureId as number | undefined
            if (!fixtureId) continue

            const cachedFixture = fixtureData.fixture as APIFootballFixture | undefined
            const pollCtx = extractFixturePollContext(cachedFixture)

            if (fixtureNeedsLiveApiPoll(pollCtx)) {
              idsToFetch.push(fixtureId)
            }
          }

          if (idsToFetch.length === 0) {
            console.log(
              `[updateLiveFixtures] Gameweek ${gameweekId}: no fixtures in live/scoring window; 0 API calls`
            )
            continue
          }

          let updatedFixtures: APIFootballFixture[]
          try {
            updatedFixtures = await fetchFixturesByIdsBatched(apiKey, idsToFetch)
          } catch (error: unknown) {
            if (error instanceof ApiFootballRateLimitError) {
              logApiFootballRateLimitWarning('updateLiveFixtures')
              return null
            }
            throw error
          }

          const fixtureMap = new Map<number, APIFootballFixture>()
          for (const fixture of updatedFixtures) {
            fixtureMap.set(fixture.fixture.id, fixture)
          }

          const batch = db.batch()
          let updateCount = 0

          for (const fixtureDoc of fixtureDocs) {
            const fixtureData = fixtureDoc.data()
            const fixtureId = fixtureData.fixtureId as number

            const updatedFixture = fixtureMap.get(fixtureId)
            if (!updatedFixture) {
              continue
            }

            const status = updatedFixture.fixture.status.short
            const finished = isMatchFinished(status)

            const currentFixture = fixtureData.fixture as APIFootballFixture | undefined
            const currentStatus = currentFixture?.fixture?.status?.short

            if (finished && currentStatus === status) {
              continue
            }

            const fixtureRef = db.collection('gameweeks').doc(gameweekId).collection('fixtures').doc(fixtureDoc.id)

            batch.update(fixtureRef, {
              fixture: updatedFixture,
            })

            updateCount++
          }

          if (updateCount > 0) {
            await batch.commit()
            console.log(
              `[updateLiveFixtures] Gameweek ${gameweekId}: updated ${updateCount} fixture(s); API fixtures requested: ${idsToFetch.length}`
            )
          }
        } catch (error: unknown) {
          console.error(`[updateLiveFixtures] Error processing gameweek ${gameweekId}:`, error)
        }
      }

      return null
    } catch (error: unknown) {
      if (error instanceof ApiFootballRateLimitError) {
        logApiFootballRateLimitWarning('updateLiveFixtures')
        return null
      }
      console.error('[updateLiveFixtures] Error in live fixture update:', error)
      return null
    }
  })

/**
 * Auto-scoring: award points for finished matches (every 5 minutes).
 */
export const autoScoring = functions
  .runWith(scheduledOpts)
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    resetApiFootballRateLimitWarning()
    const db = admin.firestore()
    let apiKey: string

    try {
      apiKey = resolveApiFootballKey()
    } catch (error: unknown) {
      console.error('[autoScoring]', error instanceof Error ? error.message : error)
      return null
    }

    try {
      const gameweeksSnapshot = await db.collection('gameweeks').where('status', '==', 'active').get()

      if (gameweeksSnapshot.empty) {
        console.log('[autoScoring] No active gameweeks; exiting with 0 API calls')
        return null
      }

      let totalAwarded = 0
      let totalProcessed = 0

      for (const gameweekDoc of gameweeksSnapshot.docs) {
        const gameweekId = gameweekDoc.id

        try {
          const fixturesSnapshot = await db.collection('gameweeks').doc(gameweekId).collection('fixtures').get()

          if (fixturesSnapshot.empty) {
            continue
          }

          const fixtureMap = new Map<number, admin.firestore.DocumentSnapshot>()
          const idsToFetch: number[] = []

          for (const fixtureDoc of fixturesSnapshot.docs) {
            const fixtureData = fixtureDoc.data()
            const fixtureId = fixtureData.fixtureId as number | undefined
            if (!fixtureId) continue

            const cachedFixture = fixtureData.fixture as APIFootballFixture | undefined
            const pollCtx = extractFixturePollContext(cachedFixture)
            const hasUnawarded = await fixtureHasUnawardedPredictions(db, fixtureId)

            if (!fixtureNeedsScoringApiPoll(pollCtx, hasUnawarded)) {
              continue
            }

            idsToFetch.push(fixtureId)
            fixtureMap.set(fixtureId, fixtureDoc)
          }

          if (idsToFetch.length === 0) {
            console.log(`[autoScoring] Gameweek ${gameweekId}: nothing to score; 0 API calls`)
            continue
          }

          let updatedFixtures: APIFootballFixture[]
          try {
            updatedFixtures = await fetchFixturesByIdsBatched(apiKey, idsToFetch)
          } catch (error: unknown) {
            if (error instanceof ApiFootballRateLimitError) {
              logApiFootballRateLimitWarning('autoScoring')
              return null
            }
            throw error
          }

          const fixtureResultsMap = new Map<number, APIFootballFixture>()
          for (const fixture of updatedFixtures) {
            fixtureResultsMap.set(fixture.fixture.id, fixture)
          }

          for (const fixtureId of idsToFetch) {
            const fixtureResult = fixtureResultsMap.get(fixtureId)
            if (!fixtureResult) {
              continue
            }

            const winner = determineMatchWinner(fixtureResult)
            if (!winner) {
              continue
            }

            try {
              const predictionsRef = db.collection('predictions').doc(String(fixtureId)).collection('entries')

              const predictionsSnapshot = await predictionsRef.get()

              if (predictionsSnapshot.empty) {
                continue
              }

              const batch = db.batch()
              let batchCount = 0
              const maxBatchSize = 500

              const userStatsUpdates = new Map<
                string,
                { pointsIncrement: number; correctIncrement: number; totalIncrement: number }
              >()

              for (const predictionDoc of predictionsSnapshot.docs) {
                const prediction = predictionDoc.data()

                if (prediction.awarded === true) {
                  continue
                }

                const uid = prediction.uid || predictionDoc.id
                const pick = prediction.pick

                if (!pick || (pick !== 'H' && pick !== 'D' && pick !== 'A')) {
                  continue
                }

                const isCorrect = pick === winner
                const points = isCorrect ? 1 : 0

                const predictionRef = db.collection('predictions').doc(String(fixtureId)).collection('entries').doc(predictionDoc.id)

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

                if (batchCount >= maxBatchSize) {
                  await batch.commit()
                  totalProcessed += batchCount
                  batchCount = 0
                }
              }

              if (batchCount > 0) {
                await batch.commit()
                totalProcessed += batchCount
              }

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
                } catch (error: unknown) {
                  console.error(`[autoScoring] Error updating user ${uid}:`, error)
                }
              }
            } catch (error: unknown) {
              console.error(`[autoScoring] Error processing fixture ${fixtureId}:`, error)
            }
          }
        } catch (error: unknown) {
          console.error(`[autoScoring] Error processing gameweek ${gameweekId}:`, error)
        }
      }

      if (totalProcessed > 0 || totalAwarded > 0) {
        console.log(`[autoScoring] Processed ${totalProcessed} predictions; awarded ${totalAwarded} points`)
      }

      return null
    } catch (error: unknown) {
      if (error instanceof ApiFootballRateLimitError) {
        logApiFootballRateLimitWarning('autoScoring')
        return null
      }
      console.error('[autoScoring] Error in auto-scoring:', error)
      return null
    }
  })

/** Weekly placement bonus multipliers */
const BONUS_MULTIPLIERS = [0.5, 0.3, 0.2] as const

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
    } catch (error: unknown) {
      console.error(`[onGameweekUpdate] Error processing gameweek ${gameweekId}:`, error)
      throw error
    }
  })

export const trackReferralSignup = functions.https.onCall(async (data: { referralCode?: string }, context) => {
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
    const usersSnapshot = await db.collection('users').where('referralCode', '==', trimmedCode).limit(1).get()
    if (usersSnapshot.empty) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid referral code')
    }

    const referrerDoc = usersSnapshot.docs[0]
    const referrerUid = referrerDoc.id

    if (referrerUid === newUserUid) {
      throw new functions.https.HttpsError('invalid-argument', 'Self-referral is not allowed')
    }

    const existingSnapshot = await db
      .collection('referrals')
      .where('referrerUid', '==', referrerUid)
      .where('referredUid', '==', newUserUid)
      .limit(1)
      .get()

    if (!existingSnapshot.empty) {
      throw new functions.https.HttpsError('already-exists', 'Referral already exists')
    }

    await db.collection('referrals').add({
      referrerUid,
      referredUid: newUserUid,
      referralCode: trimmedCode,
      status: 'completed',
      pointsAwarded: 5,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    await db.collection('users').doc(referrerUid).update({
      referralPoints: admin.firestore.FieldValue.increment(5),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  } catch (error: unknown) {
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    console.error('[trackReferralSignup] Error:', error)
    throw new functions.https.HttpsError('internal', 'Failed to process referral')
  }
})

type AdminApiFootballRequest =
  | { action: 'searchFixtures'; from: string; to: string; league?: number; team?: number; status?: string; timezone?: string; season?: number }
  | { action: 'getStandings'; leagueId: number; season: number }
  | { action: 'searchPlayers'; query: string; league?: number; season?: number }

/**
 * Admin-only proxy for API-Football (keeps API key server-side).
 */
export const adminApiFootball = functions
  .runWith(scheduledOpts)
  .https.onCall(async (data: AdminApiFootballRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
    }

    const uid = context.auth.uid
    if (!(await isUserAdmin(uid))) {
      throw new functions.https.HttpsError('permission-denied', 'Admin only')
    }

    let apiKey: string
    try {
      apiKey = resolveApiFootballKey()
    } catch {
      throw new functions.https.HttpsError('failed-precondition', 'API_FOOTBALL_KEY not configured on functions')
    }

    try {
      switch (data?.action) {
        case 'searchFixtures': {
          const fixtures = await adminSearchFixtures(apiKey, {
            from: data.from,
            to: data.to,
            league: data.league,
            team: data.team,
            status: data.status,
            timezone: data.timezone,
            season: data.season,
          })
          return { fixtures }
        }
        case 'getStandings': {
          const standings = await adminGetStandings(apiKey, data.leagueId, data.season)
          return { standings }
        }
        case 'searchPlayers': {
          const players = await adminSearchPlayers(apiKey, data.query, data.league, data.season)
          return { players }
        }
        default:
          throw new functions.https.HttpsError('invalid-argument', 'Unknown action')
      }
    } catch (error: unknown) {
      if (error instanceof ApiFootballRateLimitError) {
        throw new functions.https.HttpsError('resource-exhausted', 'API-Football rate limit; try again shortly')
      }
      console.error('[adminApiFootball] Error:', error)
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'API-Football request failed'
      )
    }
  })
