'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Trophy, ShoppingBag, ArrowRight } from 'lucide-react'
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
  const tRankings = useTranslations('rankings')
  const tShop = useTranslations('shop')

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
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Highlights: Rankings & Shop */}
        <section className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          {/* Rankings Highlight */}
          <Link
            href="/rankings/"
            className="group p-5 rounded-xl bg-midnight-violet/70 border border-ivory/15 hover:border-lime-yellow/50 transition-all flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-lime-yellow/15 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-lime-yellow" />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="font-bold text-ivory text-base group-hover:text-lime-yellow transition-colors">
                  {tRankings('title')}
                </h3>
                <p className="text-xs text-ivory/70 line-clamp-1">
                  {tRankings('subtitle')}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-ivory/50 group-hover:text-lime-yellow group-hover:translate-x-1 transition-all shrink-0" />
          </Link>

          {/* Shop Highlight */}
          <Link
            href="/shop/"
            className="group p-5 rounded-xl bg-midnight-violet/70 border border-ivory/15 hover:border-lime-yellow/50 transition-all flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-lime-yellow/15 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6 text-lime-yellow" />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="font-bold text-ivory text-base group-hover:text-lime-yellow transition-colors">
                  {tShop('title')}
                </h3>
                <p className="text-xs text-ivory/70 line-clamp-1">
                  {tShop('subtitle')}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-ivory/50 group-hover:text-lime-yellow group-hover:translate-x-1 transition-all shrink-0" />
          </Link>
        </section>
      </div>
    </AppShell>
  )
}
