import type { Locale } from '@/i18n/config'

/** Map browser language to supported app locale (signed-out / no saved preference). */
export function detectBrowserLanguage(): Locale {
  if (typeof window === 'undefined') return 'en'

  const browserLang =
    navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || 'en'

  if (browserLang.startsWith('es')) {
    return 'es-MX'
  }

  return 'en'
}
