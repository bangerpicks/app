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

// Function to detect browser/system language
function detectBrowserLanguage(): Locale {
  if (typeof window === 'undefined') return 'en'
  
  // Get browser's preferred languages
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en'
  
  // Check if it starts with 'es' (Spanish)
  if (browserLang.startsWith('es')) {
    return 'es-MX'
  }
  
  // Default to English
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [locale, setLocaleState] = useState<Locale>('en')
  const [loading, setLoading] = useState(true)

  // Load user's language preference
  useEffect(() => {
    const loadLanguage = async () => {
      if (user) {
        try {
          // If user is logged in, use their saved preference
          const userLang = await getUserLanguage(user)
          setLocaleState(userLang)
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
