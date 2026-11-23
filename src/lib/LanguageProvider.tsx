'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import { useUserProfile } from './UserProfileProvider'
import { detectBrowserLanguage } from './browser-locale'
import type { Locale } from '@/i18n/config'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => Promise<void>
  loading: boolean
}

const LOCALE_STORAGE_KEY = 'banger.locale'

function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored === 'en' || stored === 'es-MX') return stored
  } catch {
    // ignore
  }
  return null
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: async () => {},
  loading: true,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { profile } = useUserProfile()
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale() ?? 'en')
  const [loading, setLoading] = useState(true)

  // Load user's language preference
  useEffect(() => {
    if (authLoading) return
    const loadLanguage = async () => {
      const { getUserLanguage, updateUserLanguage } = await import('./user-language')
      if (user) {
        try {
          const fromProfile =
            profile?.language === 'en' || profile?.language === 'es-MX' ? profile.language : null
          const userLang = fromProfile ?? (await getUserLanguage(user))
          if (userLang) {
            setLocaleState(userLang)
          } else {
            const browser = detectBrowserLanguage()
            setLocaleState(browser)
            try {
              await updateUserLanguage(user, browser)
            } catch (persistError) {
              console.error('Error persisting initial browser language:', persistError)
            }
          }
        } catch (error) {
          console.error('Error loading user language:', error)
          // Fallback to browser language if user preference fails
          setLocaleState(detectBrowserLanguage())
        }
      } else {
        // If not logged in, use browser/system language
        setLocaleState(detectBrowserLanguage())
      }
      setLoading(false)
    }

    void loadLanguage()
  }, [user, authLoading, profile?.language])

  const setLocale = async (newLocale: Locale) => {
    if (user) {
      try {
        const { updateUserLanguage } = await import('./user-language')
        await updateUserLanguage(user, newLocale)
        setLocaleState(newLocale)
      } catch (error) {
        console.error('Error updating user language:', error)
        throw error
      }
    } else {
      setLocaleState(newLocale)
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
      } catch {
        // ignore
      }
    }
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, loading }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
