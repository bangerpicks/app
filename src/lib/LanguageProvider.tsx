'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import { getUserLanguage, updateUserLanguage, UserDocument } from './users'
import type { Locale } from '@/i18n/config'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => Promise<void>
  loading: boolean
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: async () => {},
  loading: true,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [locale, setLocaleState] = useState<Locale>('en')
  const [loading, setLoading] = useState(true)

  // Load user's language preference
  useEffect(() => {
    const loadLanguage = async () => {
      if (user) {
        try {
          const userLang = await getUserLanguage(user)
          setLocaleState(userLang)
        } catch (error) {
          console.error('Error loading user language:', error)
          setLocaleState('en')
        }
      } else {
        setLocaleState('en')
      }
      setLoading(false)
    }

    loadLanguage()
  }, [user])

  const setLocale = async (newLocale: Locale) => {
    if (user) {
      try {
        await updateUserLanguage(user, newLocale)
        setLocaleState(newLocale)
      } catch (error) {
        console.error('Error updating user language:', error)
        throw error
      }
    } else {
      setLocaleState(newLocale)
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
