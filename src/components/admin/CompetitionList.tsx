'use client'

import { useEffect, useState } from 'react'
import {
  discoverPublicCompetitions,
  createCompetition,
  updateCompetition,
} from '@/lib/competitions'
import type { CompetitionDocument } from '@/types/competition'
import { Loader2 } from 'lucide-react'

export function CompetitionList() {
  const [items, setItems] = useState<CompetitionDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const { items: page } = await discoverPublicCompetitions({ pageSize: 50 })
      setItems(page)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function ensureFlagship() {
    setBusyId('create')
    try {
      await createCompetition({
        competitionId: 'banger-world',
        displayName: 'Banger World',
        displayName_esMX: 'Banger World',
        kind: 'flagship',
        visibility: 'public',
        featured: true,
        featuredRank: 0,
      })
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function toggleFeatured(comp: CompetitionDocument) {
    setBusyId(comp.competitionId)
    try {
      await updateCompetition(comp.competitionId, {
        featured: !comp.featured,
      })
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ivory">Competitions</h2>
        <button
          type="button"
          onClick={() => void ensureFlagship()}
          disabled={busyId === 'create'}
          className="text-sm bg-lime-yellow text-midnight-violet px-3 py-1.5 rounded font-semibold"
        >
          Ensure Banger World
        </button>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-ivory/60" />
      ) : (
        <ul className="space-y-2">
          {items.map((comp) => (
            <li
              key={comp.competitionId}
              className="flex items-center justify-between gap-2 rounded border border-ivory/15 p-3"
            >
              <div>
                <p className="font-semibold text-ivory">{comp.displayName}</p>
                <p className="text-xs text-ivory/50">
                  {comp.competitionId} · {comp.visibility} · {comp.kind}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === comp.competitionId}
                onClick={() => void toggleFeatured(comp)}
                className="text-xs px-2 py-1 rounded bg-ivory/10 text-ivory"
              >
                {comp.featured ? 'Unfeature' : 'Feature'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}