'use client'

import { AppShell } from './AppShell'
import { GameweekData } from '@/types/dashboard'
import { CompetitionsSection } from './CompetitionsSection'

interface CompetitionsClientProps {
  gameweeks: GameweekData[]
  username?: string
}

export function CompetitionsClient({ gameweeks, username }: CompetitionsClientProps) {
  return (
    <AppShell
      username={username}
      mainClassName="flex-1 px-4 sm:px-5 py-2.5 pb-bottom-nav flex flex-col items-center gap-6 overflow-x-hidden"
    >
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 lg:gap-8">
        <CompetitionsSection gameweeks={gameweeks} headingAs="h1" />
      </div>
    </AppShell>
  )
}