'use client'

import { useTranslations } from 'next-intl'
import { AppShell } from './AppShell'
import { ReferralPopup } from './ReferralPopup'
import { IntroSection } from './IntroSection'
import Link from 'next/link'
import { CompetitionsSection } from './CompetitionsSection'
import { JoinCompetitionInput } from './JoinCompetitionInput'
import { GameweekData } from '@/types/dashboard'
import type { CompetitionPlayCard } from '@/types/competition'

interface DashboardClientProps {
  gameweeks?: GameweekData[]
  competitionCards?: CompetitionPlayCard[]
  gameweeksById?: Map<string, GameweekData>
  username?: string
}

export function DashboardClient({
  gameweeks = [],
  competitionCards,
  gameweeksById,
  username,
}: DashboardClientProps) {
  const t = useTranslations('dashboard')

  return (
    <AppShell
      username={username}
      banner={<ReferralPopup />}
      mainClassName="flex-1 px-4 sm:px-5 py-2.5 pb-bottom-nav flex flex-col items-center gap-6 overflow-x-hidden"
    >
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 lg:gap-8">
        <div className="w-full">
          <IntroSection isSignedIn={!!username} username={username} />
        </div>

        <div className="w-full flex flex-col gap-3 items-center">
          <JoinCompetitionInput />
          <Link
            href="/discover/"
            className="text-xs font-semibold text-lime-yellow hover:underline"
          >
            {t('browseAllCompetitions')}
          </Link>
        </div>

        {(competitionCards?.length ?? 0) > 0 || gameweeks.length > 0 ? (
          <CompetitionsSection
            gameweeks={gameweeks}
            competitionCards={competitionCards}
            gameweeksById={gameweeksById}
            headingAs="h2"
          />
        ) : (
          <p className="text-ivory/70 text-sm text-center max-w-md">{t('noActiveCompetitions')}</p>
        )}
      </div>
    </AppShell>
  )
}