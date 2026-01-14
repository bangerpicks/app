'use client'

import { NextIntlClientProvider } from 'next-intl'
import { ReactNode, useMemo } from 'react'
import { useLanguage } from './LanguageProvider'
import type { Locale } from '@/i18n/config'
import enMessages from '@/messages/en.json'
import esMXMessages from '@/messages/es-MX.json'

interface IntlProviderProps {
  children: ReactNode
}

const messages: Record<Locale, any> = {
  'en': enMessages,
  'es-MX': esMXMessages,
}

export function IntlProvider({ children }: IntlProviderProps) {
  const { locale } = useLanguage()

  const currentMessages = useMemo(() => messages[locale] || messages['en'], [locale])

  return (
    <NextIntlClientProvider locale={locale} messages={currentMessages}>
      {children}
    </NextIntlClientProvider>
  )
}
