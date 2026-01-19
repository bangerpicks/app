'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/lib/LanguageProvider'

export function DynamicLang() {
  const { locale } = useLanguage()

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  return null
}