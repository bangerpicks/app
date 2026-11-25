'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppShell } from '@/components/dashboard/AppShell'
import { PicksBackNav } from '@/components/dashboard/PicksBackNav'
import { discoverPublicCompetitions } from '@/lib/competitions'
import type { CompetitionDocument } from '@/types/competition'
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
import { CompetitionCard } from '@/components/dashboard/CompetitionCard'
import { ComingSoonCompetitionCard } from '@/components/dashboard/ComingSoonCompetitionCard'
import { isCompetitionComingSoon } from '@/lib/competition-catalog'
import type { GameweekData } from '@/types/dashboard'
import { JoinCompetitionInput } from '@/components/dashboard/JoinCompetitionInput'
import { MY_GAMES_HOME_PATH } from '@/lib/app-routes'
import { useAuth } from '@/lib/AuthProvider'
import { joinLeague, useMyLeagueMembership } from '@/lib/league-membership'
import { playCardFromCompetitionDoc } from '@/lib/home-catalog-client'

type DiscoverRow = {
  competition: CompetitionDocument
  gameweek: GameweekData
  playerCount: number
}

function rowFromPlayCard(competition: CompetitionDocument): DiscoverRow | null {
  const play = competition.playCard
  if (!play?.gameweekId || !play.gameweek) return null
  const parsed = playCardFromCompetitionDoc(
    competition,
    play as Parameters<typeof playCardFromCompetitionDoc>[1]
  )
  if (!parsed) return null
  return {
    competition,
    gameweek: parsed.gameweek,
    playerCount: parsed.card.playerCount,
  }
}

function DiscoverSkeletonGrid() {
  return (
    <div
      className="grid gap-5 grid-cols-1 md:grid-cols-2 w-full min-h-[320px]"
      aria-hidden
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="h-[220px] rounded-[10px] border border-ivory/10 bg-midnight-violet/40 animate-pulse"
        />
      ))}
    </div>
  )
}

export default function DiscoverPage() {
  const { user } = useAuth()
  const t = useTranslations('dashboard')
  const tPicks = useTranslations('picks')
  const { isMember, refresh: refreshMembership } = useMyLeagueMembership(user?.uid)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [items, setItems] = useState<CompetitionDocument[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [rows, setRows] = useState<DiscoverRow[]>([])
  const [comingSoon, setComingSoon] = useState<CompetitionDocument[]>([])

  const loadPage = useCallback(
    async (opts: { reset?: boolean; query?: string; after?: QueryDocumentSnapshot<DocumentData> | null } = {}) => {
      setLoading(true)
      try {
        const { items: page, lastDoc } = await discoverPublicCompetitions({
          pageSize: 20,
          startAfterDoc: opts.reset ? null : opts.after ?? cursor,
          searchQuery: opts.query ?? search,
        })
        setItems((prev) => (opts.reset ? page : [...prev, ...page]))
        setCursor(lastDoc)
      } finally {
        setLoading(false)
      }
    },
    [cursor, search]
  )

  useEffect(() => {
    void loadPage({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const upcoming: CompetitionDocument[] = []
    const hydrated: DiscoverRow[] = []
    for (const comp of items) {
      const row = rowFromPlayCard(comp)
      if (row) {
        hydrated.push(row)
        continue
      }
      if (isCompetitionComingSoon(comp)) upcoming.push(comp)
    }
    setRows(hydrated)
    setComingSoon(upcoming)
  }, [items])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    setCursor(null)
    void loadPage({ reset: true, query: search, after: null })
  }

  const showSkeleton = loading && rows.length === 0 && comingSoon.length === 0

  return (
    <AppShell
      banner={
        <PicksBackNav href={MY_GAMES_HOME_PATH}>{tPicks('backToDashboard')}</PicksBackNav>
      }
      mainClassName="flex-1 px-4 sm:px-5 py-6 pb-bottom-nav flex flex-col items-center gap-6 overflow-x-hidden"
    >
      <div className="w-full max-w-5xl flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black text-ivory">{t('discoverTitle')}</h1>
          <p className="text-sm text-ivory/70">{t('discoverSubtitle')}</p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-ivory/15 bg-midnight-violet/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ivory/60">
            {t('joinCodeLabel')}
          </p>
          <JoinCompetitionInput />
        </div>

        <form onSubmit={onSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('discoverSearchPlaceholder')}
            className="flex-1 rounded-lg bg-midnight-violet/80 border border-ivory/20 px-3 py-2 text-sm text-ivory"
          />
          <button
            type="submit"
            className="rounded-lg bg-ivory/10 px-4 text-sm font-semibold text-ivory"
          >
            {t('discoverSearchCta')}
          </button>
        </form>

        {showSkeleton ? (
          <DiscoverSkeletonGrid />
        ) : (
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 min-h-[120px]">
            {rows.map((row) => (
              <CompetitionCard
                key={row.competition.competitionId}
                competition={row.competition}
                gameweek={row.gameweek}
                playerCount={row.playerCount}
                discoverJoin={
                  user
                    ? {
                        isMember: isMember(row.competition.competitionId),
                        joining: joiningId === row.competition.competitionId,
                        onJoin: async () => {
                          if (!user) return
                          setJoiningId(row.competition.competitionId)
                          try {
                            await joinLeague(user.uid, row.competition.competitionId, 'discover')
                            await refreshMembership()
                          } finally {
                            setJoiningId(null)
                          }
                        },
                      }
                    : undefined
                }
              />
            ))}
            {comingSoon.map((comp) => (
              <ComingSoonCompetitionCard key={comp.competitionId} competition={comp} />
            ))}
          </div>
        )}

        {loading && rows.length > 0 ? (
          <p className="text-center text-ivory/60 text-sm">{t('discoverLoading')}</p>
        ) : null}

        {!loading && cursor ? (
          <button
            type="button"
            onClick={() => void loadPage({ after: cursor })}
            className="mx-auto rounded-lg border border-ivory/25 px-4 py-2 text-sm text-ivory"
          >
            {t('discoverLoadMore')}
          </button>
        ) : null}
      </div>
    </AppShell>
  )
}