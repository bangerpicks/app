/** Canonical production origin (apex, no trailing slash). */
export const DEFAULT_SITE_ORIGIN = 'https://bangerpicks.com'

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {string}
 */
export function getSiteOrigin(env = process.env) {
  const raw = env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_ORIGIN
  return String(raw).trim().replace(/\/+$/, '')
}

/** PWA manifest `id` — origin with trailing slash (matches start_url style). */
export function getPwaManifestId(env = process.env) {
  return `${getSiteOrigin(env)}/`
}