interface MatchStatsProps {
  score?: { home: number; away: number } | null
  homePosition: number
  awayPosition: number
  isLive?: boolean
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

export function MatchStats({ score, homePosition, awayPosition, isLive = false }: MatchStatsProps) {
  const homeSuffix = getOrdinalSuffix(homePosition)
  const awaySuffix = getOrdinalSuffix(awayPosition)

  return (
    <div className="flex flex-col items-center justify-center gap-4 flex-1">
      {/* Score with dash separator - increased prominence */}
      <div className="flex items-center gap-3">
        {score ? (
          <>
            <span className={`text-3xl sm:text-4xl font-bold tracking-[0.24px] text-white ${isLive ? 'animate-pulse' : ''}`}>
              {score.home}
            </span>
            <span className="text-xl sm:text-2xl font-medium tracking-[0.14px] text-white opacity-70">
              -
            </span>
            <span className={`text-3xl sm:text-4xl font-bold tracking-[0.24px] text-white ${isLive ? 'animate-pulse' : ''}`}>
              {score.away}
            </span>
          </>
        ) : (
          <>
            <span className="text-3xl sm:text-4xl font-bold tracking-[0.24px] text-white">-</span>
            <span className="text-xl sm:text-2xl font-medium tracking-[0.14px] text-white opacity-70">
              -
            </span>
            <span className="text-3xl sm:text-4xl font-bold tracking-[0.24px] text-white">-</span>
          </>
        )}
      </div>

      {/* League Position - clear and side-by-side */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider text-center">
          League Position
        </span>
        <div className="flex items-baseline gap-4">
          <span className="text-base font-semibold text-white">
            {homePosition}
            <span className="text-[10px] leading-none relative -top-1">{homeSuffix}</span>
          </span>
          <span className="text-sm text-white/50">|</span>
          <span className="text-base font-semibold text-white">
            {awayPosition}
            <span className="text-[10px] leading-none relative -top-1">{awaySuffix}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
