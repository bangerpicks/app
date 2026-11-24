'use client'

import { useTranslations } from 'next-intl'
import { Check, Loader2 } from 'lucide-react'

interface PicksFirstJoinConfirmProps {
  isSaving: boolean
  saveSucceeded: boolean
}

export function PicksFirstJoinConfirm({ isSaving, saveSucceeded }: PicksFirstJoinConfirmProps) {
  const t = useTranslations('picks')

  return (
    <div
      className="w-full rounded-xl border-2 border-lime-yellow/50 bg-midnight-violet/90 px-5 py-8 flex flex-col items-center text-center gap-3 animate-[picksCardIn_220ms_ease-out]"
      role="status"
      aria-live="polite"
    >
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-lime-yellow bg-lime-yellow/15 transition-transform duration-300 ${
          saveSucceeded ? 'scale-100' : 'scale-95'
        }`}
      >
        {isSaving ? (
          <Loader2 className="w-8 h-8 text-lime-yellow animate-spin" aria-hidden />
        ) : (
          <Check className="w-8 h-8 text-lime-yellow" strokeWidth={2.5} aria-hidden />
        )}
      </div>
      <h2 className="text-xl font-bold text-ivory">{t('firstJoinCompleteTitle')}</h2>
      <p className="text-sm text-ivory/75 max-w-xs">{t('allPicksSaved')}</p>
      {isSaving ? (
        <p className="text-xs text-lime-yellow/90 tabular-nums">{t('autoSaving')}</p>
      ) : saveSucceeded ? (
        <p className="text-xs text-ivory/55">{t('returningToDashboard')}</p>
      ) : null}
    </div>
  )
}