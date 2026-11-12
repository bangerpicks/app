'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { EmailPasswordForm } from './EmailPasswordForm'
import { EmailLinkForm } from './EmailLinkForm'

type EmailSubMode = 'password' | 'link'

interface EmailAuthPanelProps {
  referralCode: string | null
  onDone: (referralMessage: string | null) => void
  onError: (message: string) => void
  onReferralMessage: (message: string) => void
  onSuccessMessage: (message: string) => void
}

export function EmailAuthPanel({
  referralCode,
  onDone,
  onError,
  onReferralMessage,
  onSuccessMessage,
}: EmailAuthPanelProps) {
  const t = useTranslations('auth')
  const [subMode, setSubMode] = useState<EmailSubMode>('password')

  return (
    <div className="space-y-3">
      <div className="flex gap-2 p-0.5 rounded-lg bg-midnight-violet/10">
        <button
          type="button"
          onClick={() => setSubMode('password')}
          className={`flex-1 py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wide rounded-md transition-colors ${
            subMode === 'password'
              ? 'bg-midnight-violet text-lime-yellow'
              : 'text-midnight-violet/80'
          }`}
        >
          {t('emailModePassword')}
        </button>
        <button
          type="button"
          onClick={() => setSubMode('link')}
          className={`flex-1 py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wide rounded-md transition-colors ${
            subMode === 'link' ? 'bg-midnight-violet text-lime-yellow' : 'text-midnight-violet/80'
          }`}
        >
          {t('emailModeLink')}
        </button>
      </div>

      {subMode === 'password' ? (
        <EmailPasswordForm
          referralCode={referralCode}
          onDone={onDone}
          onError={onError}
          onReferralMessage={onReferralMessage}
          onSuccessMessage={onSuccessMessage}
        />
      ) : (
        <EmailLinkForm onError={onError} />
      )}
    </div>
  )
}
