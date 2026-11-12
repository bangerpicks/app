'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
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

type NavIcon = React.ComponentType<SVGProps<SVGSVGElement>>

interface NavItem {
  iconOutline: NavIcon
  iconSolid: NavIcon
  labelKey: string
  href: string
}

const navItems: NavItem[] = [
  {
    iconOutline: DashboardOutlineIcon,
    iconSolid: DashboardSolidIcon,
    labelKey: 'navigation.dashboard',
    href: '/dashboard',
  },
  {
    iconOutline: RankingsOutlineIcon,
    iconSolid: RankingsSolidIcon,
    labelKey: 'navigation.rankings',
    href: '/rankings',
  },
  {
    iconOutline: ShopOutlineIcon,
    iconSolid: ShopSolidIcon,
    labelKey: 'navigation.shop',
    href: '/shop',
  },
  {
    iconOutline: ProfileOutlineIcon,
    iconSolid: ProfileSolidIcon,
    labelKey: 'navigation.profile',
    href: '/profile',
  },
]

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }
  return path
}

function isNavItemActive(pathname: string, href: string): boolean {
  return normalizePath(pathname) === normalizePath(href)
}

export function BottomNavigation() {
  const pathname = usePathname()
  const t = useTranslations()

  return (
    <nav
      className="sticky bottom-0 z-10 h-[100px] bg-lime-yellow rounded-t-[10px] px-2 sm:px-5 py-2.5 flex items-center justify-between"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href)
        const Icon = isActive ? item.iconSolid : item.iconOutline
        const label = t(item.labelKey)

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1.5 sm:gap-2.5"
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={`w-8 h-8 sm:w-[38px] sm:h-[38px] shrink-0 text-midnight-violet ${
                isActive ? 'opacity-100' : 'opacity-65'
              }`}
              aria-hidden="true"
            />
            <span
              className={`text-xs sm:text-sm font-semibold tracking-[0.7px] text-midnight-violet truncate w-full text-center ${
                isActive ? 'font-bold' : ''
              }`}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
