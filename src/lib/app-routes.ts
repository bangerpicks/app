/** Canonical “My games” home (formerly `/dashboard/`, `/competitions/`). */
export const MY_GAMES_HOME_PATH = '/my-games/' as const

/** @deprecated Use {@link MY_GAMES_HOME_PATH}. */
export const COMPETITIONS_HOME_PATH = MY_GAMES_HOME_PATH

export const LEGACY_DASHBOARD_PATH = '/dashboard/' as const
export const LEGACY_COMPETITIONS_PATH = '/competitions/' as const

export function normalizeAppPath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }
  return path
}

export function isMyGamesHomePath(pathname: string): boolean {
  const path = normalizeAppPath(pathname)
  return path === '/my-games' || path === '/competitions' || path === '/dashboard'
}

/** @deprecated Use {@link isMyGamesHomePath}. */
export const isCompetitionsHomePath = isMyGamesHomePath