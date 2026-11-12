import {
  OfficialConfidence,
  Prediction,
  type MatchVenue,
} from '@/types/dashboard'
import type { Locale } from '@/i18n/config'

export interface GafferWinProbabilities {
  home: number
  draw: number
  away: number
}

export function resolveWhyItMatters(
  whyItMatters: string | undefined,
  whyItMatters_esMX: string | undefined,
  locale: string
): string | undefined {
  const es = whyItMatters_esMX?.trim()
  if (locale === 'es-MX' && es) return es
  const en = whyItMatters?.trim()
  return en || undefined
}

const PICK_I18N_KEY: Record<Prediction, 'home' | 'draw' | 'away'> = {
  H: 'home',
  D: 'draw',
  A: 'away',
}

export function officialPickTranslationKey(
  pick: Prediction
): 'home' | 'draw' | 'away' {
  return PICK_I18N_KEY[pick]
}

const CONFIDENCE_I18N_KEY: Record<OfficialConfidence, string> = {
  Strong: 'confidenceStrong',
  Lean: 'confidenceLean',
  'Toss-up': 'confidenceTossUp',
}

export function officialConfidenceTranslationKey(
  confidence: OfficialConfidence
): string {
  return CONFIDENCE_I18N_KEY[confidence]
}

/** Valid league table rank (positive integer). */
export function isDisplayableLeagueRank(
  position: number | null | undefined
): position is number {
  return typeof position === 'number' && Number.isFinite(position) && position > 0
}

function englishOrdinalSuffix(num: number): string {
  if (num > 3 && num < 21) return 'th'
  switch (num % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

export type LeagueRankParts = {
  rank: number
  suffix: string
}

/** Rank + ordinal/suffix parts for styled rendering (e.g. smaller st/nd). */
export function formatLeagueRankParts(
  position: number | null | undefined,
  locale: Locale
): LeagueRankParts | null {
  if (!isDisplayableLeagueRank(position)) return null
  const rank = Math.trunc(position)
  if (locale === 'es-MX') {
    return { rank, suffix: '.º' }
  }
  return { rank, suffix: englishOrdinalSuffix(rank) }
}

/** Player-facing league rank label; Spanish uses superscript º, not English ordinals. */
export function formatLeagueRankLabel(
  position: number | null | undefined,
  locale: Locale
): string | null {
  const parts = formatLeagueRankParts(position, locale)
  if (!parts) return null
  return `${parts.rank}${parts.suffix}`
}

export function shouldShowLeaguePositionRow(
  homePosition: number | null | undefined,
  awayPosition: number | null | undefined
): boolean {
  return (
    isDisplayableLeagueRank(homePosition) || isDisplayableLeagueRank(awayPosition)
  )
}

export function formatMatchVenue(
  venue: MatchVenue | undefined
): string | undefined {
  if (!venue) return undefined
  const name = venue.name?.trim()
  const city = venue.city?.trim()
  if (name && city) return `${name}, ${city}`
  return name || city || undefined
}

export function venueFromApiFootball(
  venue: { name?: string | null; city?: string | null } | undefined
): MatchVenue | undefined {
  if (!venue) return undefined
  const name = venue.name?.trim() ?? ''
  const city = venue.city?.trim() ?? ''
  if (!name && !city) return undefined
  return { name, city }
}

/**
 * Map API-Football fixture.status.short to dashboard match card status.
 */
export function mapApiFootballStatusToMatchStatus(apiStatus: string): string {
  if (apiStatus === 'NS' || apiStatus === 'TBD') {
    return 'TBP'
  }
  if (apiStatus === 'HT') {
    return 'HT'
  }
  if (
    apiStatus === '1H' ||
    apiStatus === '2H' ||
    apiStatus === 'ET' ||
    apiStatus === 'P'
  ) {
    return 'LIVE'
  }
  return apiStatus
}
