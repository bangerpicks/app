'use client'

import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

type BackfillResult = { task: string; updated: number; skipped: number }

export function OpsBackfillPanel() {
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string | null>(null)

  async function run(dryRun: boolean) {
    setBusy(true)
    setLog(null)
    try {
      const fn = httpsCallable(functions, 'adminRunBackfills')
      const res = await fn({ tasks: ['all'], dryRun })
      const data = res.data as { dryRun: boolean; results: BackfillResult[] }
      setLog(
        (dryRun ? 'Dry run:\n' : 'Executed:\n') +
          data.results.map((r) => `${r.task}: ${r.updated} updated, ${r.skipped} skipped`).join('\n')
      )
    } catch (e) {
      setLog(e instanceof Error ? e.message : 'Backfill failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-ivory/20 p-4 space-y-3">
      <h3 className="text-sm font-bold text-ivory">Ops backfills</h3>
      <p className="text-xs text-ivory/60">
        Slim fixtures, displayNames claims, crowd counters, standings meta, weeklyStandings rebuild.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(true)}
          className="rounded bg-ivory/10 px-3 py-2 text-xs font-semibold text-ivory"
        >
          Dry run
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(false)}
          className="rounded bg-lime-yellow px-3 py-2 text-xs font-semibold text-midnight-violet"
        >
          Run on production
        </button>
      </div>
      {log ? <pre className="text-xs text-ivory/80 whitespace-pre-wrap">{log}</pre> : null}
    </div>
  )
}