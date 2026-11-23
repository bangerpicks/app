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

/** Absolute open time in the viewer's own timezone, e.g. "Mon, Nov 23, 8:00 PM CST". */
export function formatComingSoonOpensAt(date: Date, locale: Locale): string {
  const intlLocale = intlLocaleForAppLocale(locale)
  return new Intl.DateTimeFormat(intlLocale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}
