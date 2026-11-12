'use client'

import { useTranslations } from 'next-intl'
import { Prediction } from '@/types/dashboard'

interface PredictionButtonsProps {
  homeTeamName: string
  awayTeamName: string
  selected?: Prediction | null
  onSelect: (prediction: Prediction) => void
  disabled?: boolean
}

export function PredictionButtons({
  homeTeamName,
  awayTeamName,
  selected,
  onSelect,
  disabled = false,
}: PredictionButtonsProps) {
  const t = useTranslations('dashboard')

  const columns: {
    value: Prediction
    label: string
    caption?: string
    ariaLabel: string
  }[] = [
    {
      value: 'H',
      label: t('home'),
      caption: homeTeamName,
      ariaLabel: `Pick ${homeTeamName} to win`,
    },
    {
      value: 'D',
      label: t('draw'),
      ariaLabel: 'Pick draw',
    },
    {
      value: 'A',
      label: t('away'),
      caption: awayTeamName,
      ariaLabel: `Pick ${awayTeamName} to win`,
    },
  ]

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-ivory/75 text-center">
        {t('yourPick')}
      </p>
      <div className="flex gap-2 sm:gap-2.5 justify-center w-full">
        {columns.map((column) => {
          const isSelected = selected === column.value
          return (
            <div
              key={column.value}
              className="flex flex-1 min-w-0 max-w-[100px] flex-col items-center gap-1"
            >
              <button
                type="button"
                onClick={() => !disabled && onSelect(column.value)}
                disabled={disabled}
                className={`
                  w-full min-h-[44px] rounded-[10px]
                  text-sm sm:text-base font-bold italic tracking-[0.16px]
                  transition-all
                  ${
                    isSelected
                      ? 'bg-lime-yellow text-midnight-violet ring-2 ring-lime-yellow ring-offset-2 ring-offset-midnight-violet !opacity-100 prediction-result-slot'
                      : 'bg-ivory text-midnight-violet'
                  }
                  ${
                    disabled && !isSelected
                      ? 'opacity-50 cursor-not-allowed'
                      : disabled && isSelected
                        ? '!opacity-100 cursor-default'
                        : 'hover:bg-lime-yellow active:bg-lime-yellow cursor-pointer'
                  }
                `}
                aria-label={column.ariaLabel}
              >
                {column.label}
              </button>
              {column.caption ? (
                <span
                  className="w-full text-[9px] font-normal text-ivory/55 text-center truncate leading-tight px-0.5"
                  title={column.caption}
                >
                  {column.caption}
                </span>
              ) : (
                <span className="h-[11px] w-full shrink-0" aria-hidden />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
