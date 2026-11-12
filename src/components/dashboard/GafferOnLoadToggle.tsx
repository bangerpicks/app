'use client'

import { Check } from 'lucide-react'

interface GafferOnLoadToggleProps {
  label: string
  value: boolean
  openLabel: string
  closedLabel: string
  disabled?: boolean
  onChange: (openOnLoad: boolean) => void
}

export function GafferOnLoadToggle({
  label,
  value,
  openLabel,
  closedLabel,
  disabled = false,
  onChange,
}: GafferOnLoadToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-ivory/90 text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          disabled={disabled}
          className={`px-3 py-2.5 rounded-lg border transition-colors flex items-center justify-between text-sm ${
            value
              ? 'bg-lime-yellow/20 border-lime-yellow text-ivory'
              : 'bg-ivory/5 border-ivory/20 text-ivory/80 hover:bg-ivory/10'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="font-medium">{openLabel}</span>
          {value ? <Check className="w-4 h-4 text-lime-yellow shrink-0" /> : null}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          disabled={disabled}
          className={`px-3 py-2.5 rounded-lg border transition-colors flex items-center justify-between text-sm ${
            !value
              ? 'bg-lime-yellow/20 border-lime-yellow text-ivory'
              : 'bg-ivory/5 border-ivory/20 text-ivory/80 hover:bg-ivory/10'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="font-medium">{closedLabel}</span>
          {!value ? <Check className="w-4 h-4 text-lime-yellow shrink-0" /> : null}
        </button>
      </div>
    </div>
  )
}
