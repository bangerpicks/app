import type { Locale } from '@/i18n/config'

export function intlLocaleForAppLocale(locale: Locale): 'en-US' | 'es-MX' {
  return locale === 'es-MX' ? 'es-MX' : 'en-US'
}

export function formatMatchCardHeaderDate(date: Date, locale: Locale): string {
  const intlLocale = intlLocaleForAppLocale(locale)
  return new Intl.DateTimeFormat(intlLocale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatMatchKickoffTime(date: Date, locale: Locale): string {
  const intlLocale = intlLocaleForAppLocale(locale)
  return new Intl.DateTimeFormat(intlLocale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
