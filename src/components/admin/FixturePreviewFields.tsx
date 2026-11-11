'use client'

import { APIFootballFixture } from '@/lib/api-football'
import { GameweekFixturePreviewMeta } from '@/types/admin'
import { OfficialConfidence, Prediction } from '@/types/dashboard'

interface FixturePreviewFieldsProps {
  fixtures: APIFootballFixture[]
  previewById: Record<number, GameweekFixturePreviewMeta>
  onChange: (fixtureId: number, next: GameweekFixturePreviewMeta) => void
}

const emptyPreview = (): GameweekFixturePreviewMeta => ({})

export function FixturePreviewFields({
  fixtures,
  previewById,
  onChange,
}: FixturePreviewFieldsProps) {
  if (fixtures.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-[10px] p-4 mt-4">
      <h3 className="text-lg font-bold text-ivory mb-2">Match card preview</h3>
      <p className="text-xs text-ivory/60 mb-4">
        Optional copy for the dashboard match card (why it matters and official Gaffer pick).
      </p>
      <div className="space-y-4 max-h-[480px] overflow-y-auto">
        {fixtures.map((fixture) => {
          const fixtureId = fixture.fixture.id
          const preview = previewById[fixtureId] ?? emptyPreview()
          const update = (patch: Partial<GameweekFixturePreviewMeta>) => {
            onChange(fixtureId, { ...preview, ...patch })
          }

          return (
            <div
              key={fixtureId}
              className="bg-gray-800 border border-gray-700 rounded-[10px] p-3 space-y-3"
            >
              <p className="text-xs font-medium text-ivory">
                {fixture.teams.home.name} vs {fixture.teams.away.name}
              </p>
              <div>
                <label className="block text-xs text-ivory/80 mb-1">Why it matters</label>
                <input
                  type="text"
                  value={preview.whyItMatters ?? ''}
                  onChange={(e) => update({ whyItMatters: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                  placeholder="One-line context for players"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ivory/80 mb-1">Official pick (Gaffer)</label>
                  <select
                    value={preview.officialPick ?? ''}
                    onChange={(e) => {
                      const v = e.target.value as Prediction | ''
                      update({ officialPick: v === '' ? undefined : v })
                    }}
                    className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                  >
                    <option value="">—</option>
                    <option value="H">Home — {fixture.teams.home.name}</option>
                    <option value="D">Draw</option>
                    <option value="A">Away — {fixture.teams.away.name}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-ivory/80 mb-1">Confidence</label>
                  <select
                    value={preview.officialConfidence ?? ''}
                    onChange={(e) => {
                      const v = e.target.value as OfficialConfidence | ''
                      update({ officialConfidence: v === '' ? undefined : v })
                    }}
                    className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                  >
                    <option value="">—</option>
                    <option value="Strong">Strong</option>
                    <option value="Lean">Lean</option>
                    <option value="Toss-up">Toss-up</option>
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
