import type { SVGProps } from 'react'
import {
  RectangleStackIcon as CompetitionsOutlineIcon,
  TableCellsIcon as LeaderboardsOutlineIcon,
  ShoppingBagIcon as ShopOutlineIcon,
} from '@heroicons/react/24/outline'
import {
  RectangleStackIcon as CompetitionsSolidIcon,
  TableCellsIcon as LeaderboardsSolidIcon,
  ShoppingBagIcon as ShopSolidIcon,
} from '@heroicons/react/24/solid'
import { MY_GAMES_HOME_PATH } from '@/lib/app-routes'

export type DashboardNavIcon = React.ComponentType<SVGProps<SVGSVGElement>>

export interface DashboardNavItem {
  iconOutline: DashboardNavIcon
  iconSolid: DashboardNavIcon
  labelKey: string
  href: string
}

// Trailing slashes match next.config `trailingSlash: true` so client nav hits
// `/route/index.txt` instead of a missing `/route.txt` (stuck soft-nav).
export const dashboardNavItems: DashboardNavItem[] = [
  {
    iconOutline: CompetitionsOutlineIcon,
    iconSolid: CompetitionsSolidIcon,
    labelKey: 'navigation.leagues',
    href: MY_GAMES_HOME_PATH,
  },
  {
    iconOutline: LeaderboardsOutlineIcon,
    iconSolid: LeaderboardsSolidIcon,
    labelKey: 'navigation.rankings',
    href: '/rankings/',
  },
  {
    iconOutline: ShopOutlineIcon,
    iconSolid: ShopSolidIcon,
    labelKey: 'navigation.shop',
    href: '/shop/',
  },
]

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }
  return path
}

export function isDashboardNavItemActive(pathname: string, href: string): boolean {
  return normalizePath(pathname) === normalizePath(href)
}

export function isPicksRoute(pathname: string): boolean {
  return normalizePath(pathname) === '/picks'
}

/** Sub-routes where the Leagues nav tab acts as a back control (mobile + desktop header). */
export function isDashboardBackNavRoute(pathname: string): boolean {
  const path = normalizePath(pathname)
  return path === '/picks' || path === '/discover'
}
