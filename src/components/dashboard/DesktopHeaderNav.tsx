'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { dashboardNavItems, isDashboardNavItemActive } from './dashboard-nav'

export function DesktopHeaderNav() {
  const pathname = usePathname()
  const t = useTranslations()

  return (
    <nav
      className="hidden lg:flex items-center justify-center gap-1 flex-1 min-w-0 px-4"
      aria-label="Main"
    >
      {dashboardNavItems.map((item) => {
        const isActive = isDashboardNavItemActive(pathname, item.href)
        const Icon = isActive ? item.iconSolid : item.iconOutline
        const label = t(item.labelKey)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors min-h-[44px] ${
              isActive
                ? 'bg-lime-yellow text-midnight-violet'
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
