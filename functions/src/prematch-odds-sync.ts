import * as admin from 'firebase-admin'
import { apiFootballGet } from './api-football-client'
import { extractFixturePollContext } from './fixture-window'
import type { APIFootballFixture } from './api-football-types'
import {
  fixtureNeedsPreMatchOddsRefresh,
  parsePreMatchOddsFromApiPayload,
} from './market-odds'

type OddsApiResponse = {
  response?: Array<{
    update?: string
    bookmakers?: Array<{
      id?: number
      name?: string
      bets?: Array<{
        id?: number
        name?: string
        values?: Array<{ value?: string; odd?: string }>
      }>
    }>
  }>
  results?: number
}

function readTimestampMs(value: unknown): number | null {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as admin.firestore.Timestamp).toMillis === 'function'
  ) {
    return (value as admin.firestore.Timestamp).toMillis()
  }
  return null
}

function marketOddsLastCheckedAtMs(
  data: Record<string, unknown> | undefined
): number | null {
  const marketOdds = data?.marketOdds as
    | { fetchedAt?: admin.firestore.Timestamp }
    | undefined
  const fromSnapshot = readTimestampMs(marketOdds?.fetchedAt)
  if (fromSnapshot != null) return fromSnapshot
  return readTimestampMs(data?.marketOddsCheckedAt)
}

export async function syncPreMatchOddsForActiveGameweeks(
  db: admin.firestore.Firestore,
  apiKey: string
): Promise<{ fixturesChecked: number; apiCalls: number; updated: number }> {
  const gameweeksSnapshot = await db
    .collection('gameweeks')
    .where('status', '==', 'active')
    .get()

  let fixturesChecked = 0
  let apiCalls = 0
  let updated = 0

  if (gameweeksSnapshot.empty) {
    return { fixturesChecked, apiCalls, updated }
  }

  for (const gameweekDoc of gameweeksSnapshot.docs) {
    const gameweekId = gameweekDoc.id
    const fixturesSnapshot = await db
      .collection('gameweeks')
      .doc(gameweekId)
      .collection('fixtures')
      .get()

    for (const fixtureDoc of fixturesSnapshot.docs) {
      const fixtureData = fixtureDoc.data()
      const fixtureId = fixtureData.fixtureId as number | undefined
      if (!fixtureId) continue

      fixturesChecked += 1

      const cachedFixture = fixtureData.fixture as APIFootballFixture | undefined
      const pollCtx = extractFixturePollContext(cachedFixture)
      const lastCheckedAtMs = marketOddsLastCheckedAtMs(fixtureData)

      if (
        !fixtureNeedsPreMatchOddsRefresh({
          kickoffTimestampSec: pollCtx.kickoffTimestampSec,
          statusShort: pollCtx.statusShort,
          lastCheckedAtMs,
        })
      ) {
        continue
      }

      let oddsPayload: OddsApiResponse
      try {
        oddsPayload = (await apiFootballGet(apiKey, '/odds', {
          fixture: fixtureId,
          bet: 1,
        })) as OddsApiResponse
        apiCalls += 1
      } catch (error) {
        console.error(
          `[refreshPreMatchOdds] Gameweek ${gameweekId} fixture ${fixtureId}: odds fetch failed`,
          error
        )
        continue
      }

      const row = oddsPayload.response?.[0]
      const parsed = parsePreMatchOddsFromApiPayload(row)

      if (!parsed) {
        console.log(
          `[refreshPreMatchOdds] Gameweek ${gameweekId} fixture ${fixtureId}: no complete 1X2 odds`
        )
        await fixtureDoc.ref.update({
          marketOddsCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        continue
      }

      await fixtureDoc.ref.update({
        marketOdds: {
          ...parsed,
          fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        marketOddsCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      updated += 1
    }
  }

  return { fixturesChecked, apiCalls, updated }
}
