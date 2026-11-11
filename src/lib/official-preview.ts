import { OfficialConfidence, Prediction } from '@/types/dashboard'

export function officialPickLabel(
  pick: Prediction,
  homeTeamName: string,
  awayTeamName: string
): string {
  if (pick === 'H') return homeTeamName
  if (pick === 'A') return awayTeamName
  return 'Draw'
}

/** House preview line for match cards; null when pick or confidence is missing. */
export function formatGafferPreviewLine(
  pick: Prediction | undefined,
  confidence: OfficialConfidence | undefined,
  homeTeamName: string,
  awayTeamName: string
): string | null {
  if (!pick || !confidence) return null
  const pickLabel = officialPickLabel(pick, homeTeamName, awayTeamName)
  return `Gaffer: ${pickLabel} · ${confidence}`
}
