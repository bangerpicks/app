import { Prediction } from '@/types/dashboard'

interface PredictionButtonsProps {
  selected?: Prediction | null
  onSelect: (prediction: Prediction) => void
  disabled?: boolean
}

export function PredictionButtons({
  selected,
  onSelect,
  disabled = false,
}: PredictionButtonsProps) {
  const buttons: { value: Prediction; label: string }[] = [
    { value: 'H', label: 'HOME' },
    { value: 'D', label: 'DRAW' },
    { value: 'A', label: 'AWAY' },
  ]

  return (
    <div className="flex gap-2 sm:gap-2.5 justify-center w-full">
      {buttons.map((button) => {
        const isSelected = selected === button.value
        return (
          <button
            key={button.value}
            type="button"
            onClick={() => !disabled && onSelect(button.value)}
            disabled={disabled}
            className={`
              flex-1 min-w-0 max-w-[100px] min-h-[44px] bg-ivory rounded-[10px] 
              text-sm sm:text-base font-bold italic tracking-[0.16px] text-midnight-violet
              cursor-pointer transition-all
              ${isSelected ? 'ring-2 ring-lime-yellow ring-offset-2 ring-offset-midnight-violet' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-lime-yellow active:bg-lime-yellow'}
            `}
            aria-label={`Predict ${button.label.toLowerCase()}`}
          >
            {button.label}
          </button>
        )
      })}
    </div>
  )
}
