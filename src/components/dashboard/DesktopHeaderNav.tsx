'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeftIcon } from '@heroicons/react/24/solid'
import {
  dashboardNavItems,
  isDashboardNavItemActive,
  isDashboardBackNavRoute,
} from './dashboard-nav'

export function DesktopHeaderNav() {
  const pathname = usePathname()
  const t = useTranslations()
  const tPicks = useTranslations('picks')
  const dashboardTabAsBack = isDashboardBackNavRoute(pathname)

  return (
    <nav
      className="hidden lg:flex items-center justify-center gap-1 flex-1 min-w-0 px-4"
      aria-label={t('common.mainNavAria')}
    >
      {dashboardNavItems.map((item) => {
        const dashboardAsBack =
          dashboardTabAsBack && item.href === '/dashboard/'
        const isActive =
          !dashboardAsBack && isDashboardNavItemActive(pathname, item.href)
        const Icon = dashboardAsBack ? ChevronLeftIcon : isActive ? item.iconSolid : item.iconOutline
        const label = dashboardAsBack
          ? tPicks('backToDashboard')
          : t(item.labelKey)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors min-h-[44px] touch-manipulation ${
              isActive
                ? 'bg-lime-yellow text-midnight-violet'
                : dashboardAsBack
                  ? 'text-lime-yellow hover:text-lime-yellow/90 hover:bg-ivory/10'
                  : 'text-ivory/80 hover:text-ivory hover:bg-ivory/10'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
