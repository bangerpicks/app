'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, Globe, Trophy } from 'lucide-react'
import { DEFAULT_FLAGSHIP_ID } from '@/lib/competition-catalog.mjs'

export type RankingsCompetitionSelectOption = { id: string; label: string }

interface RankingsCompetitionSelectProps {
  options: RankingsCompetitionSelectOption[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function CompetitionMark({ competitionId }: { competitionId: string }) {
  const Icon = competitionId === DEFAULT_FLAGSHIP_ID ? Globe : Trophy
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-yellow text-midnight-violet shadow-sm"
      aria-hidden
    >
      <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={2.25} />
    </span>
  )
}

export function RankingsCompetitionSelect({
  options,
  selectedId,
  onSelect,
}: RankingsCompetitionSelectProps) {
  const t = useTranslations('rankings')
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  if (options.length === 0) {
    return null
  }

  const value = selectedId && options.some((o) => o.id === selectedId)
    ? selectedId
    : options[0].id
  const selected = options.find((o) => o.id === value) ?? options[0]
  const canExpand = options.length > 1

  const pick = (id: string) => {
    close()
    if (id !== value) onSelect(id)
  }

  return (
    <div
      ref={rootRef}
      className="rankings-competition-picker w-full max-w-2xl lg:max-w-4xl shrink-0"
    >
      <p className="mb-1.5 px-0.5 text-[11px] font-semibold tracking-wide text-ivory/55">
        {t('competitionPickerLabel')}
      </p>
      <div className="relative">
        <button
          type="button"
          id={`${listId}-trigger`}
          aria-expanded={canExpand ? open : false}
          aria-haspopup={canExpand ? 'listbox' : undefined}
          aria-controls={canExpand ? listId : undefined}
          disabled={!canExpand}
          onClick={() => {
            if (canExpand) setOpen((v) => !v)
          }}
          className="rankings-competition-picker-trigger group flex w-full items-center gap-3 rounded-xl border border-lime-yellow/30 bg-gradient-to-br from-lime-yellow/[0.14] via-midnight-violet to-ivory/[0.07] px-3 py-2.5 sm:py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-yellow/55 disabled:cursor-default touch-manipulation"
        >
          <CompetitionMark competitionId={selected.id} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black leading-tight text-ivory sm:text-base">
              {selected.label}
            </span>
            {canExpand ? (
              <span className="mt-0.5 block text-[11px] font-medium text-ivory/50">
                {t('competitionPickerTap')}
              </span>
            ) : null}
          </span>
          {canExpand ? (
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-lime-yellow transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden
            />
          ) : null}
        </button>

        {open && canExpand ? (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={`${listId}-trigger`}
            className="rankings-competition-picker-menu absolute z-[140] mt-2 max-h-[min(16rem,50dvh)] w-full overflow-y-auto overscroll-contain rounded-xl border border-ivory/15 bg-midnight-violet py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          >
            {options.map((opt) => {
              const isSelected = opt.id === value
              return (
                <li key={opt.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => pick(opt.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-lime-yellow/15 text-ivory'
                        : 'text-ivory/85 hover:bg-ivory/10 active:bg-ivory/15'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                        isSelected
                          ? 'bg-lime-yellow text-midnight-violet'
                          : 'bg-ivory/10 text-lime-yellow'
                      }`}
                      aria-hidden
                    >
                      {opt.id === DEFAULT_FLAGSHIP_ID ? (
                        <Globe className="h-4 w-4" strokeWidth={2.25} />
                      ) : (
                        <Trophy className="h-4 w-4" strokeWidth={2.25} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {opt.label}
                    </span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-lime-yellow" aria-hidden />
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}