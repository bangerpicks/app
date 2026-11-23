'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AppShell } from '@/components/dashboard/AppShell'
import { discoverPublicCompetitions } from '@/lib/competitions'
import type { CompetitionDocument } from '@/types/competition'
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
import { getGameweekById } from '@/lib/admin'
import { convertAdminGameweekToGameweekData } from '@/lib/convert-gameweek-data'
import { CompetitionCard } from '@/components/dashboard/CompetitionCard'
import { ComingSoonCompetitionCard } from '@/components/dashboard/ComingSoonCompetitionCard'
import { isCompetitionComingSoon } from '@/lib/competition-catalog'
import type { GameweekData } from '@/types/dashboard'

type DiscoverRow = {
  competition: CompetitionDocument
  gameweek: GameweekData
  playerCount: number
}

export default function DiscoverPage() {
  const t = useTranslations('dashboard')
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
    async function hydrate() {
      const upcoming: CompetitionDocument[] = []
      const withGw = items.filter((comp) => {
        const gwId = comp.activeGameweekId
        if (!gwId) {
          if (isCompetitionComingSoon(comp)) upcoming.push(comp)
          return false
        }
        return true
      })

      const settled = await Promise.all(
        withGw.map(async (comp) => {
          const gwId = comp.activeGameweekId!
          try {
            const gw = await getGameweekById(gwId)
            if (!gw) return null
            const data = convertAdminGameweekToGameweekData(gw)
            return {
              competition: comp,
              gameweek: data,
              playerCount: data.playerCount ?? 0,
            } satisfies DiscoverRow
          } catch {
            return null
          }
        })
      )

      setRows(settled.filter((row): row is DiscoverRow => row !== null))
      setComingSoon(upcoming)
    }
    void hydrate()
  }, [items])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    setCursor(null)
    void loadPage({ reset: true, query: search, after: null })
  }

  return (
    <AppShell mainClassName="flex-1 px-4 sm:px-5 py-6 pb-bottom-nav flex flex-col items-center gap-6 overflow-x-hidden">
      <div className="w-full max-w-5xl flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black text-ivory">{t('discoverTitle')}</h1>
          <p className="text-sm text-ivory/70">{t('discoverSubtitle')}</p>
          <Link href="/dashboard/" className="text-xs text-lime-yellow font-semibold">
            {t('discoverBackHome')}
          </Link>
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

        <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
          {rows.map((row) => (
            <CompetitionCard
              key={row.competition.competitionId}
              competition={row.competition}
              gameweek={row.gameweek}
              playerCount={row.playerCount}
            />
          ))}
          {comingSoon.map((comp) => (
            <ComingSoonCompetitionCard key={comp.competitionId} competition={comp} />
          ))}
        </div>

        {loading ? (
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