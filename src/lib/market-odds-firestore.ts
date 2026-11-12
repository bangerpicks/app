import type { MarketOddsSnapshot } from '@/types/dashboard'
import { hasDisplayableMarketOdds } from '@/lib/market-odds'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readTriplet(
  obj: Record<string, unknown> | undefined
): { home: number; draw: number; away: number } | null {
  if (!obj) return null
  const home = obj.home
  const draw = obj.draw
  const away = obj.away
  if (
    typeof home !== 'number' ||
    typeof draw !== 'number' ||
    typeof away !== 'number'
  ) {
    return null
  }
  return { home, draw, away }
}

/** Normalize marketOdds from a Firestore fixture document. */
export function marketOddsFromFirestoreData(
  data: unknown
): MarketOddsSnapshot | undefined {
  if (!isRecord(data)) return undefined

  const decimalOdds = readTriplet(
    isRecord(data.decimalOdds) ? data.decimalOdds : undefined
  )
  const impliedPercents = readTriplet(
    isRecord(data.impliedPercents) ? data.impliedPercents : undefined
  )

  if (!decimalOdds || !impliedPercents) return undefined

  const bookmakerId = data.bookmakerId
  const bookmakerName = data.bookmakerName
  const overround = data.overround
  const betId = data.betId
  const source = data.source

  if (
    source !== 'api-football' ||
    betId !== 1 ||
    typeof bookmakerId !== 'number' ||
    typeof bookmakerName !== 'string' ||
    typeof overround !== 'number'
  ) {
    return undefined
  }

  const snapshot: MarketOddsSnapshot = {
    source: 'api-football',
    betId: 1,
    bookmakerId,
    bookmakerName,
    decimalOdds,
    impliedPercents,
    overround,
  }

  if (typeof data.apiUpdatedAt === 'string' && data.apiUpdatedAt.trim()) {
    snapshot.apiUpdatedAt = data.apiUpdatedAt
  }

  return hasDisplayableMarketOdds(snapshot) ? snapshot : undefined
}
