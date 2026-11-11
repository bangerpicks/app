import { MatchCardData, Prediction } from '@/types/dashboard'
import { formatGafferPreviewLine } from '@/lib/official-preview'
import { TeamInfo } from './TeamInfo'
import { MatchStats } from './MatchStats'
import { PredictionButtons } from './PredictionButtons'

interface MatchCardProps {
  match: MatchCardData
  userPrediction?: Prediction | null
  onPredictionSelect: (fixtureId: number, prediction: Prediction) => void
  disabled?: boolean
  /** When true, show prediction and result only (no buttons) */
  readOnly?: boolean
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
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

function formatDate(date: Date): string {
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)
  const day = date.getDate()
  const suffix = getOrdinalSuffix(day)
  return `${weekday}, ${month} ${day}${suffix}`
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function MatchCard({
  match,
  userPrediction,
  onPredictionSelect,
  disabled = false,
  readOnly = false,
}: MatchCardProps) {
  const handlePredictionSelect = (prediction: Prediction) => {
    if (!readOnly) onPredictionSelect(match.fixtureId, prediction)
  }

  const gafferPreview = formatGafferPreviewLine(
    match.officialPick,
    match.officialConfidence,
    match.homeTeam.name,
    match.awayTeam.name
  )

  return (
    <div className="w-full">
      {/* Match Info Header */}
      <div className="bg-ivory h-[35px] rounded-t-[10px] px-2 sm:px-2.5 grid grid-cols-3 items-center gap-1 sm:gap-2">
        <div className="text-[10px] sm:text-xs font-medium text-midnight-violet text-left truncate min-w-0">
          {match.league.name}
        </div>
        <div className="text-[10px] sm:text-xs font-medium text-midnight-violet text-center truncate min-w-0 px-1">
          {match.matchStatus === 'LIVE' ? 'LIVE' : formatDate(match.date)}
        </div>
        <div className="text-[10px] sm:text-xs font-medium text-midnight-violet text-right truncate min-w-0 flex items-center justify-end gap-1.5">
          {match.matchStatus === 'HT' ? (
            <>
              <span>HT</span>
              <span 
                className="w-1.5 h-1.5 rounded-full bg-cinnabar animate-pulse"
                style={{
                  boxShadow: '0 0 6px #ee4136',
                }}
              />
            </>
          ) : match.matchStatus === 'LIVE' ? (
            <>
              <span>
                {match.minute}
                {match.stoppageTime ? `+${match.stoppageTime}` : ''}'
              </span>
              <span 
                className="w-1.5 h-1.5 rounded-full bg-cinnabar animate-pulse"
                style={{
                  boxShadow: '0 0 6px #ee4136',
                }}
              />
            </>
          ) : match.matchStatus === 'FT' ? (
            <span>FT</span>
          ) : (
            <span>{formatTime(match.date)}</span>
          )}
        </div>
      </div>

      <div className="border border-ivory rounded-b-[10px] px-2.5 py-2.5 flex flex-col gap-3">
        {match.whyItMatters || gafferPreview ? (
          <div className="flex flex-col gap-1 items-center">
            {match.whyItMatters ? (
              <p className="text-xs text-ivory/80 text-center leading-snug line-clamp-2 w-full">
                {match.whyItMatters}
              </p>
            ) : null}
            {gafferPreview ? (
              <p
                className="text-[11px] text-lime-yellow/95 font-semibold text-center leading-snug line-clamp-1 w-full"
                aria-label="Official house preview"
              >
                {gafferPreview}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center gap-2.5">
          {/* Home Team */}
          <TeamInfo team={match.homeTeam} />

          {/* Match Stats */}
          <MatchStats
            score={match.score}
            homePosition={match.homeTeam.position}
            awayPosition={match.awayTeam.position}
            isLive={match.matchStatus === 'LIVE' || match.matchStatus === 'HT'}
          />

          {/* Away Team */}
          <TeamInfo team={match.awayTeam} />
        </div>

        {/* Prediction Buttons or read-only prediction */}
        {readOnly ? (
          <div className="flex items-center justify-center gap-2 py-1">
            {userPrediction ? (
              <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded font-bold text-sm bg-ivory/20 text-ivory prediction-result-slot">
                {userPrediction}
              </span>
            ) : (
              <span className="text-ivory/50 text-sm">—</span>
            )}
          </div>
        ) : (
          <PredictionButtons
            selected={userPrediction}
            onSelect={handlePredictionSelect}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  )
}
