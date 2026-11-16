'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { isDisplayNameAvailable } from '@/lib/users'
import { saveUserDisplayName } from '@/lib/save-user-display-name'
import { writeLocalValidDisplayName } from '@/lib/profile-device-flags'
import { isReservedDisplayName, suggestedDisplayNameFromAuth } from '@/lib/display-name'
import { getRandomSuggestions } from '@/data/displayNameSuggestions'

export interface DisplayNameCapturePanelProps {
  /** Pre-fill when Auth already has a non-placeholder name. */
  authDisplayName?: string | null
  referralCode?: string | null
  onSuccess: (displayName: string) => void
  submitLabel?: string
  /** Local preview: validate only, no Firestore or Auth writes. */
  readOnlyPreview?: boolean
}

export function DisplayNameCapturePanel({
  authDisplayName,
  referralCode = null,
  onSuccess,
  submitLabel,
  readOnlyPreview = false,
}: DisplayNameCapturePanelProps) {
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const tSettings = useTranslations('settings')
  const tUsername = useTranslations('usernameGate')
  const [loading, setLoading] = useState(false)
  const [selectedDisplayName, setSelectedDisplayName] = useState<string>('')
  const [customDisplayName, setCustomDisplayName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [showRetry, setShowRetry] = useState(false)
  const [recommendedNames] = useState<string[]>(() => getRandomSuggestions(12))

  useEffect(() => {
    const suggestion = suggestedDisplayNameFromAuth(authDisplayName)
    if (suggestion) {
      setCustomDisplayName(suggestion)
      setSelectedDisplayName('')
    }
  }, [authDisplayName])

  const validateDisplayName = (name: string): string | null => {
    if (!name || name.trim().length === 0) {
      return t('displayNameRequired')
    }
    if (isReservedDisplayName(name)) {
      return t('displayNameReserved')
    }
    if (name.trim().length < 2) {
      return t('displayNameMinLength')
    }
    if (name.trim().length > 30) {
      return t('displayNameMaxLength')
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
      return t('displayNameInvalid')
    }
    return null
  }

  const handleDisplayNameSelect = (name: string) => {
    setSelectedDisplayName(name)
    setCustomDisplayName('')
    setError(null)
    setShowRetry(false)
  }

  const runSave = async () => {
    setError(null)
    setShowRetry(false)
    setLoading(true)

    try {
      const displayName = customDisplayName.trim() || selectedDisplayName
      const validationError = validateDisplayName(displayName)
      if (validationError) {
        setError(validationError)
        setLoading(false)
        return
      }

      const trimmedDisplayName = displayName.trim()
      const user = auth.currentUser
      if (!user) {
        setError(t('noUserFoundSignIn'))
        setLoading(false)
        return
      }

      if (readOnlyPreview) {
        onSuccess(trimmedDisplayName)
        setLoading(false)
        return
      }

      const isAvailable = await isDisplayNameAvailable(trimmedDisplayName, user.uid)
      if (!isAvailable) {
        setError(t('displayNameTaken'))
        setLoading(false)
        return
      }

      const result = await saveUserDisplayName(user, trimmedDisplayName, { referralCode })
      if (!result.ok) {
        if (result.code === 'taken') {
          setError(t('displayNameTaken'))
        } else if (result.code === 'reserved') {
          setError(t('displayNameReserved'))
        } else if (result.code === 'timeout') {
          setError(tUsername('saveTimeout'))
          setShowRetry(true)
        } else {
          setError(tUsername('saveFailed'))
          setShowRetry(true)
        }
        setLoading(false)
        return
      }

      writeLocalValidDisplayName(
        typeof window !== 'undefined' ? window.localStorage : null,
        user.uid
      )
      onSuccess(trimmedDisplayName)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('failedToUpdate')
      setError(message)
      setShowRetry(true)
      console.error('Display name save error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await runSave()
  }

  const resolvedSubmitLabel =
    submitLabel ??
    (loading
      ? tSettings('saving')
      : suggestedDisplayNameFromAuth(authDisplayName) &&
          customDisplayName.trim() === suggestedDisplayNameFromAuth(authDisplayName) &&
          !selectedDisplayName
        ? tUsername('confirmName')
        : tCommon('continue'))

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-x-hidden pb-6">
      <p className="text-ivory/80 text-sm sm:text-base mb-4 text-center">
        {t('displayNameDescription')}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-cinnabar text-ivory rounded text-sm space-y-2">
          <p>{error}</p>
          {showRetry && (
            <button
              type="button"
              onClick={() => void runSave()}
              disabled={loading}
              className="underline font-semibold text-lime-yellow disabled:opacity-50"
            >
              {tUsername('tryAgain')}
            </button>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-ivory mb-2">{t('recommendedNames')}</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {recommendedNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleDisplayNameSelect(name)}
              className={`px-4 py-2 rounded font-semibold text-sm min-h-[44px] transition-colors ${
                selectedDisplayName === name && !customDisplayName.trim()
                  ? 'bg-lime-yellow text-midnight-violet'
                  : 'bg-ivory/10 text-ivory hover:bg-ivory/20'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="display-name-capture-custom" className="block text-sm font-semibold text-ivory mb-2">
          {t('orEnterCustom')}
        </label>
        <input
          id="display-name-capture-custom"
          type="text"
          value={customDisplayName}
          onChange={(e) => {
            setCustomDisplayName(e.target.value)
            setSelectedDisplayName('')
            setError(null)
            setShowRetry(false)
          }}
          placeholder={t('enterDisplayName')}
          maxLength={30}
          className="w-full px-4 py-2.5 min-h-[44px] rounded border border-ivory/30 text-ivory bg-midnight-violet focus:outline-none focus:ring-2 focus:ring-lime-yellow text-base placeholder:text-ivory/40"
        />
        <p className="mt-1 text-xs text-ivory/70">{t('displayNameRequirements')}</p>
      </div>
      <button
        type="submit"
        disabled={loading || (!selectedDisplayName && !customDisplayName.trim())}
        className="w-full bg-lime-yellow text-midnight-violet py-3 px-4 rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:bg-opacity-80 flex items-center justify-center gap-2 transition-colors"
      >
        {resolvedSubmitLabel}
        <ArrowRight className="w-5 h-5" />
      </button>
    </form>
  )
}