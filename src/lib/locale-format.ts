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

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Kickoff time, or short weekday (Mon, Tue, …) when kickoff is more than 24h away. */
export function formatMatchPreviewKickoffOrWeekday(
  date: Date,
  locale: Locale,
  now: Date = new Date()
): string {
  if (date.getTime() - now.getTime() > MS_PER_DAY) {
    const intlLocale = intlLocaleForAppLocale(locale)
    return new Intl.DateTimeFormat(intlLocale, { weekday: 'short' }).format(date)
  }
  return formatMatchKickoffTime(date, locale)
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
