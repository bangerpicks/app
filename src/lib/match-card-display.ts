import { OfficialConfidence, Prediction } from '@/types/dashboard'

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
