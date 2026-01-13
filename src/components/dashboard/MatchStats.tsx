interface MatchStatsProps {
  score?: { home: number; away: number } | null
  homePosition: number
  awayPosition: number
}

function getOrdinalSuffix(num: number): string {
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

export function MatchStats({ score, homePosition, awayPosition }: MatchStatsProps) {
  const scoreDisplay = score ? `${score.home} - ${score.away}` : '-'
  const homeSuffix = getOrdinalSuffix(homePosition)
  const awaySuffix = getOrdinalSuffix(awayPosition)

  return (
    <div className="flex flex-col items-center justify-center gap-1 flex-1">
      {/* Score Dashes and VS */}
      <div className="flex items-center gap-2">
        {score ? (
          <>
            <span className="text-2xl font-semibold tracking-[0.24px] text-white">{score.home}</span>
            <span className="text-sm font-semibold tracking-[0.14px] text-white">VS</span>
            <span className="text-2xl font-semibold tracking-[0.24px] text-white">{score.away}</span>
          </>
        ) : (
          <>
            <span className="text-2xl font-semibold tracking-[0.24px] text-white">-</span>
            <span className="text-sm font-semibold tracking-[0.14px] text-white">VS</span>
            <span className="text-2xl font-semibold tracking-[0.24px] text-white">-</span>
          </>
        )}
      </div>

      {/* Position */}
      <div className="flex items-center gap-1">
        <span className="text-base font-semibold text-white relative">
          {homePosition}
          <span className="absolute -top-1 -right-2 text-[8px] leading-none">{homeSuffix}</span>
        </span>
        <span className="text-[10px] font-semibold leading-4 tracking-[0.1px] text-white">
          Position
        </span>
        <span className="text-base font-semibold text-white relative">
          {awayPosition}
          <span className="absolute -top-1 -right-2 text-[8px] leading-none">{awaySuffix}</span>
        </span>
      </div>

      {/* Form Label */}
      <span className="text-[10px] font-semibold leading-4 tracking-[0.1px] text-white">
        Form
      </span>
    </div>
  )
}
