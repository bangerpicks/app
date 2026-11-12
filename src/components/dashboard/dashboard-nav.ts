import type { SVGProps } from 'react'
import {
  Squares2X2Icon as DashboardOutlineIcon,
  TrophyIcon as RankingsOutlineIcon,
  ShoppingBagIcon as ShopOutlineIcon,
  UserCircleIcon as ProfileOutlineIcon,
} from '@heroicons/react/24/outline'
import {
  Squares2X2Icon as DashboardSolidIcon,
  TrophyIcon as RankingsSolidIcon,
  ShoppingBagIcon as ShopSolidIcon,
  UserCircleIcon as ProfileSolidIcon,
} from '@heroicons/react/24/solid'

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
    iconOutline: DashboardOutlineIcon,
    iconSolid: DashboardSolidIcon,
    labelKey: 'navigation.dashboard',
    href: '/dashboard/',
  },
  {
    iconOutline: RankingsOutlineIcon,
    iconSolid: RankingsSolidIcon,
    labelKey: 'navigation.rankings',
    href: '/rankings/',
  },
  {
    iconOutline: ShopOutlineIcon,
    iconSolid: ShopSolidIcon,
    labelKey: 'navigation.shop',
    href: '/shop/',
  },
  {
    iconOutline: ProfileOutlineIcon,
    iconSolid: ProfileSolidIcon,
    labelKey: 'navigation.profile',
    href: '/profile/',
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
