'use client'

import { useTranslations } from 'next-intl'
import { AppShell } from './AppShell'
import { IntroSection } from './IntroSection'
import { CompetitionsSection } from './CompetitionsSection'
import { GameweekData } from '@/types/dashboard'
import type { CompetitionDocument, CompetitionPlayCard } from '@/types/competition'

interface DashboardClientProps {
  gameweeks?: GameweekData[]
  competitionCards?: CompetitionPlayCard[]
  gameweeksById?: Map<string, GameweekData>
  comingSoonCompetitions?: CompetitionDocument[]
  username?: string
  onLeagueMembershipChange?: () => void
  highlightCompetitionId?: string | null
}

export function DashboardClient({
  gameweeks = [],
  competitionCards,
  gameweeksById,
  comingSoonCompetitions = [],
  username,
  onLeagueMembershipChange,
  highlightCompetitionId,
}: DashboardClientProps) {
  const t = useTranslations('dashboard')
  const isSignedIn = Boolean(username)

  return (
    <AppShell
      username={username}
      mainClassName="flex-1 px-4 sm:px-5 py-2.5 pb-bottom-nav flex flex-col items-center gap-5 overflow-x-hidden"
    >
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-5 lg:gap-6">
        {!isSignedIn ? (
          <div className="w-full">
            <IntroSection isSignedIn={false} />
          </div>
        ) : null}

        {(competitionCards?.length ?? 0) > 0 ||
        comingSoonCompetitions.length > 0 ||
        gameweeks.length > 0 ? (
          <CompetitionsSection
            gameweeks={gameweeks}
            competitionCards={competitionCards}
            gameweeksById={gameweeksById}
            comingSoonCompetitions={comingSoonCompetitions}
            headingAs="h2"
            showSectionHeader={!isSignedIn}
            flatGrid
            showLeagueActions={isSignedIn}
            onLeagueMembershipChange={onLeagueMembershipChange}
            highlightCompetitionId={highlightCompetitionId}
          />
        ) : (
          <p className="text-ivory/70 text-sm text-center max-w-md">{t('noActiveCompetitions')}</p>
        )}
      </div>
    </AppShell>
  )
}