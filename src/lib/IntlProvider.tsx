'use client'

import { NextIntlClientProvider } from 'next-intl'
import { ReactNode, useEffect, useState } from 'react'
import { useLanguage } from './LanguageProvider'
import { timeZone, type Locale } from '@/i18n/config'

interface IntlProviderProps {
  children: ReactNode
}

export function IntlProvider({ children }: IntlProviderProps) {
  const { locale } = useLanguage()
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    let cancelled = false
    const loader =
      locale === 'es-MX'
        ? import('@/messages/es-MX.json')
        : import('@/messages/en.json')
    void loader.then((mod) => {
      if (!cancelled) setMessages(mod.default as Record<string, unknown>)
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  if (!messages) {
    return null
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  )
}
