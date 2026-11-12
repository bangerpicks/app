/**
 * i18n configuration for next-intl
 */

export type Locale = 'en' | 'es-MX'

export const locales: Locale[] = ['en', 'es-MX']
export const defaultLocale: Locale = 'en'

/** Fixed TZ so next-intl date formatting is consistent across build, SSR, and client. */
export const timeZone = 'America/Mexico_City'
