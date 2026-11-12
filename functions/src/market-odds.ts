/** Pre-match 1X2 (Match Winner) market odds from API-Football /odds?bet=1 */

export const MATCH_WINNER_BET_ID = 1

/** Bookmaker preference: Pinnacle, Bet365, William Hill */
export const PREFERRED_BOOKMAKER_IDS = [4, 8, 7] as const

export interface DecimalOddsTriplet {
  home: number
  draw: number
  away: number
}

export interface ImpliedPercentTriplet {
  home: number
  draw: number
  away: number
}

export interface ParsedMarketOdds {
  source: 'api-football'
  betId: typeof MATCH_WINNER_BET_ID
  bookmakerId: number
  bookmakerName: string
  decimalOdds: DecimalOddsTriplet
  impliedPercents: ImpliedPercentTriplet
  overround: number
  apiUpdatedAt?: string
}

type OddValue = { value?: string; odd?: string }

type OddsBookmaker = {
  id?: number
  name?: string
  bets?: Array<{
    id?: number
    name?: string
    values?: OddValue[]
  }>
}

type OddsFixturePayload = {
  update?: string
  bookmakers?: OddsBookmaker[]
}

function parseDecimalOdd(value: string | undefined): number | null {
  if (!value) return null
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n) || n <= 1) return null
  return n
}

/** Extract Home / Draw / Away decimal odds from Match Winner (bet id 1). */
export function extractMatchWinnerOdds(
  bookmaker: OddsBookmaker
): DecimalOddsTriplet | null {
  const bets = bookmaker.bets ?? []
  const matchWinner =
    bets.find((b) => b.id === MATCH_WINNER_BET_ID) ??
  bets.find((b) => b.name === 'Match Winner')

  const values = matchWinner?.values ?? []
  let home: number | null = null
  let draw: number | null = null
  let away: number | null = null

  for (const row of values) {
    const label = row.value?.trim().toLowerCase()
    const odd = parseDecimalOdd(row.odd)
    if (odd == null || !label) continue
    if (label === 'home') home = odd
    else if (label === 'draw') draw = odd
    else if (label === 'away') away = odd
  }

  if (home == null || draw == null || away == null) {
    return null
  }

  return { home, draw, away }
}

export function bookmakerHasCompleteMatchWinnerTrio(bookmaker: OddsBookmaker): boolean {
  return extractMatchWinnerOdds(bookmaker) !== null
}

/**
 * Choose bookmaker: Pinnacle → Bet365 → William Hill → first complete trio.
 */
export function selectPreferredBookmaker(
  bookmakers: OddsBookmaker[]
): OddsBookmaker | null {
  if (!bookmakers.length) return null

  for (const preferredId of PREFERRED_BOOKMAKER_IDS) {
    const match = bookmakers.find(
      (b) => b.id === preferredId && bookmakerHasCompleteMatchWinnerTrio(b)
    )
    if (match) return match
  }

  return bookmakers.find((b) => bookmakerHasCompleteMatchWinnerTrio(b)) ?? null
}

function roundPercentsTo100(
  home: number,
  draw: number,
  away: number
): ImpliedPercentTriplet {
  const raw = [home, draw, away]
  const floored = raw.map((v) => Math.floor(v))
  let remainder = 100 - (floored[0] + floored[1] + floored[2])

  const fractions = raw.map((v, i) => ({ i, frac: v - floored[i] }))
  fractions.sort((a, b) => b.frac - a.frac)

  const out = [...floored]
  let k = 0
  while (remainder > 0 && k < fractions.length) {
    out[fractions[k].i] += 1
    remainder -= 1
    k += 1
  }

  return { home: out[0], draw: out[1], away: out[2] }
}

/**
 * De-vig implied win probabilities: p_i = (1/odds_i) / sum_j(1/odds_j).
 * Percents are integers summing to 100.
 */
export function devigImpliedPercents(
  odds: DecimalOddsTriplet
): { impliedPercents: ImpliedPercentTriplet; overround: number } {
  const invHome = 1 / odds.home
  const invDraw = 1 / odds.draw
  const invAway = 1 / odds.away
  const overround = invHome + invDraw + invAway

  if (!Number.isFinite(overround) || overround <= 0) {
    throw new Error('Invalid odds for de-vig')
  }

  const homePct = (invHome / overround) * 100
  const drawPct = (invDraw / overround) * 100
  const awayPct = (invAway / overround) * 100

  return {
    overround,
    impliedPercents: roundPercentsTo100(homePct, drawPct, awayPct),
  }
}

export function parsePreMatchOddsFromApiPayload(
  payload: OddsFixturePayload | undefined
): ParsedMarketOdds | null {
  if (!payload?.bookmakers?.length) return null

  const bookmaker = selectPreferredBookmaker(payload.bookmakers)
  if (!bookmaker?.id || !bookmaker.name) return null

  const decimalOdds = extractMatchWinnerOdds(bookmaker)
  if (!decimalOdds) return null

  const { impliedPercents, overround } = devigImpliedPercents(decimalOdds)

  return {
    source: 'api-football',
    betId: MATCH_WINNER_BET_ID,
    bookmakerId: bookmaker.id,
    bookmakerName: bookmaker.name,
    decimalOdds,
    impliedPercents,
    overround,
    apiUpdatedAt: payload.update,
  }
}

const ODDS_REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000

export function fixtureNeedsPreMatchOddsRefresh(opts: {
  kickoffTimestampSec: number | null | undefined
  statusShort: string | null | undefined
  lastCheckedAtMs: number | null | undefined
  nowMs?: number
}): boolean {
  const now = opts.nowMs ?? Date.now()
  const status = opts.statusShort ?? ''

  if (opts.kickoffTimestampSec != null && opts.kickoffTimestampSec > 0) {
    const kickoffMs = opts.kickoffTimestampSec * 1000
    if (now >= kickoffMs) {
      return false
    }
  }

  if (status && status !== 'NS' && status !== 'TBD') {
    return false
  }

  if (opts.lastCheckedAtMs == null) {
    return true
  }

  return now - opts.lastCheckedAtMs >= ODDS_REFRESH_INTERVAL_MS
}
