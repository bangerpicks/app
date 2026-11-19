'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeftIcon as ChevronLeftSolidIcon } from '@heroicons/react/24/solid'
import {
  dashboardNavItems,
  isDashboardNavItemActive,
  isPicksRoute,
} from './dashboard-nav'

export function BottomNavigation() {
  const pathname = usePathname()
  const t = useTranslations()
  const tPicks = useTranslations('picks')
  const onPicksPage = isPicksRoute(pathname)

  return (
    <nav
      data-bottom-nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-30 h-[84px] bg-lime-yellow rounded-t-[10px] px-2 sm:px-5 py-2 flex items-center justify-between lg:hidden"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {dashboardNavItems.map((item) => {
        const dashboardAsBack =
          onPicksPage && item.href === '/dashboard/'
        const isActive =
          !dashboardAsBack && isDashboardNavItemActive(pathname, item.href)
        const Icon = dashboardAsBack
          ? ChevronLeftSolidIcon
          : isActive
            ? item.iconSolid
            : item.iconOutline
        const label = dashboardAsBack
          ? tPicks('backToDashboard')
          : t(item.labelKey)
        const emphasized = isActive || dashboardAsBack

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 sm:gap-1.5"
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-midnight-violet ${
                emphasized ? 'opacity-100' : 'opacity-65'
              }`}
              aria-hidden="true"
            />
            <span
              className={`text-xs sm:text-sm font-semibold tracking-[0.7px] text-midnight-violet truncate w-full text-center ${
                emphasized ? 'font-bold' : ''
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
