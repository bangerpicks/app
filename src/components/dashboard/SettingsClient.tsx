'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { useAuth } from '@/lib/AuthProvider'
import { useLanguage } from '@/lib/LanguageProvider'
import { getUserLanguage, updateUserLanguage } from '@/lib/users'
import { Settings, Check, ArrowLeft } from 'lucide-react'
import type { Locale } from '@/i18n/config'

export function SettingsClient() {
  const { user } = useAuth()
  const { locale, setLocale, loading: languageLoading } = useLanguage()
  const router = useRouter()
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')

  const [selectedLanguage, setSelectedLanguage] = useState<Locale>(locale)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [username, setUsername] = useState<string | undefined>(undefined)

  // Initialize selected language from user's preference
  useEffect(() => {
    if (user && !languageLoading) {
      getUserLanguage(user)
        .then((lang) => {
          setSelectedLanguage(lang)
        })
        .catch((error) => {
          console.error('Error fetching user language:', error)
        })
    }
  }, [user, languageLoading])

  // Fetch username for header
  useEffect(() => {
    if (user) {
      // Get username from user displayName for header
      setUsername(user.displayName || undefined)
    } else {
      setUsername(undefined)
    }
  }, [user])

  const handleLanguageChange = (language: Locale) => {
    setSelectedLanguage(language)
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    if (!user || selectedLanguage === locale) {
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      await setLocale(selectedLanguage)
      setSaveSuccess(true)
      // Clear success message after a moment
      setTimeout(() => {
        setSaveSuccess(false)
      }, 2000)
    } catch (error) {
      console.error('Error saving language preference:', error)
      setSaveError(t('error'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    router.push('/profile')
  }

  return (
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex flex-col">
      {/* Header */}
      <Header username={username} />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-5 pb-20 sm:pb-24 py-4 sm:py-5 overflow-x-hidden">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 text-ivory/70 hover:text-ivory transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{tCommon('profile')}</span>
        </button>

        {/* Title Section */}
        <div className="w-full max-w-2xl mx-auto mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-lime-yellow" />
            <h1 className="text-2xl sm:text-3xl font-bold text-ivory">
              {t('title')}
            </h1>
          </div>
        </div>

        {/* Language Selection */}
        <div className="w-full max-w-2xl mx-auto mb-6">
          <div className="bg-ivory/5 border border-ivory/10 rounded-lg px-4 py-4">
            <h2 className="text-ivory font-semibold text-lg mb-2">
              {t('language')}
            </h2>
            <p className="text-ivory/60 text-sm mb-4">
              {t('languageDescription')}
            </p>

            <div className="flex flex-col gap-2">
              {/* English Option */}
              <button
                onClick={() => handleLanguageChange('en')}
                disabled={isSaving}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between ${
                  selectedLanguage === 'en'
                    ? 'bg-lime-yellow/20 border-lime-yellow text-ivory'
                    : 'bg-ivory/5 border-ivory/20 text-ivory/80 hover:bg-ivory/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="font-medium">{t('english')}</span>
                {selectedLanguage === 'en' && (
                  <Check className="w-5 h-5 text-lime-yellow" />
                )}
              </button>

              {/* Spanish Option */}
              <button
                onClick={() => handleLanguageChange('es-MX')}
                disabled={isSaving}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between ${
                  selectedLanguage === 'es-MX'
                    ? 'bg-lime-yellow/20 border-lime-yellow text-ivory'
                    : 'bg-ivory/5 border-ivory/20 text-ivory/80 hover:bg-ivory/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="font-medium">{t('spanish')}</span>
                {selectedLanguage === 'es-MX' && (
                  <Check className="w-5 h-5 text-lime-yellow" />
                )}
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-4">
            <button
              onClick={handleSave}
              disabled={isSaving || selectedLanguage === locale}
              className="w-full bg-lime-yellow text-midnight-violet py-3 px-6 rounded-lg font-semibold text-lg hover:bg-opacity-90 transition-colors active:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <span>{t('saving')}</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>{t('saved')}</span>
                </>
              ) : (
                <span>{tCommon('save')}</span>
              )}
            </button>

            {/* Error Message */}
            {saveError && (
              <p className="mt-2 text-sm text-cinnabar text-center">
                {saveError}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
