import {
  OfficialConfidence,
  Prediction,
  type MatchVenue,
} from '@/types/dashboard'

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
