import Image from 'next/image'
import type { ReactNode } from 'react'
import type { CompetitionLeagueBrand } from '@/lib/competition-league-brand'

interface CompetitionCardHeaderMarkProps {
  leagueBrand: CompetitionLeagueBrand | null
  fallback: ReactNode
}

const WRAP_CLASS =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-midnight-violet/15 bg-midnight-violet/10'

export function CompetitionCardHeaderMark({
  leagueBrand,
  fallback,
}: CompetitionCardHeaderMarkProps) {
  return (
    <div className={WRAP_CLASS} aria-hidden>
      {leagueBrand?.logo ? (
        <Image
          src={leagueBrand.logo}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
          unoptimized
        />
      ) : (
        fallback
      )}
    </div>
  )
}