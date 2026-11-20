'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { AppShell } from './AppShell'
import { IntroSection } from './IntroSection'
import { GameweekCard } from './GameweekCard'
import { GameweekData } from '@/types/dashboard'

interface DashboardClientProps {
  gameweeks?: GameweekData[]
  gameweek?: GameweekData
  playerCount?: number
  username?: string
  fixturesPending?: boolean
}

export function DashboardClient({
  gameweeks,
  gameweek,
  playerCount,
  username,
}: DashboardClientProps) {
  const t = useTranslations('dashboard')

  const activeGameweeks = useMemo(() => {
    if (gameweeks && gameweeks.length > 0) {
      return gameweeks
    }
    if (gameweek) {
      return [{ ...gameweek, playerCount: playerCount ?? gameweek.playerCount }]
    }
    return []
  }, [gameweeks, gameweek, playerCount])

  return (
    <AppShell
      username={username}
      mainClassName="flex-1 px-4 sm:px-5 py-2.5 pb-bottom-nav flex flex-col items-center gap-6 overflow-x-hidden"
    >
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 lg:gap-8">
        {/* Unified Hero & How It Works Section */}
        <div className="w-full">
          <IntroSection isSignedIn={!!username} username={username} />
        </div>

        {/* Competitions Section */}
        <section className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-black text-ivory tracking-wide">
              {t('availableCompetitions')}
            </h2>
            <p className="text-sm text-ivory/70">
              {t('availableCompetitionsSubtitle')}
            </p>
          </div>

          {activeGameweeks.length === 0 ? (
            <div className="w-full p-8 rounded-xl bg-midnight-violet/60 border border-ivory/15 text-center">
              <p className="text-ivory/80 text-base">
                {t('noActiveCompetitions')}
              </p>
            </div>
          ) : (
            <div
              className={`w-full grid gap-5 ${
                activeGameweeks.length > 1
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 max-w-xl mx-auto'
              }`}
            >
              {activeGameweeks.map((gw) => (
                <div key={gw.gameweekId} className="w-full flex flex-col">
                  <GameweekCard
                    gameweek={gw}
                    playerCount={gw.playerCount}
                    href={`/picks/?id=${gw.gameweekId}`}
                    isInteractive
                    showMatchPreviews
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
