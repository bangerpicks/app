'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useVisualViewportBottomInset } from '@/hooks/useVisualViewportBottomInset'
import { useTranslations } from 'next-intl'
import { ChevronLeftIcon as ChevronLeftSolidIcon } from '@heroicons/react/24/solid'
import {
  dashboardNavItems,
  isDashboardNavItemActive,
  isDashboardBackNavRoute,
} from './dashboard-nav'

export function BottomNavigation() {
  const pathname = usePathname()
  const t = useTranslations()
  const tPicks = useTranslations('picks')
  const dashboardTabAsBack = isDashboardBackNavRoute(pathname)
  const [mounted, setMounted] = useState(false)
  const viewportBottomInset = useVisualViewportBottomInset()

  useEffect(() => {
    setMounted(true)
    return () => {
      document.querySelectorAll('nav[data-bottom-nav]').forEach((node) => node.remove())
    }
  }, [])

  const nav = (
    <nav
      data-bottom-nav
      aria-label={t('common.mainNavAria')}
      className="fixed bottom-0 left-0 right-0 z-[120] h-[84px] bg-lime-yellow rounded-t-[10px] px-2 sm:px-5 py-2 flex items-center justify-between lg:hidden pointer-events-auto"
      style={{
        bottom: viewportBottomInset,
        paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {dashboardNavItems.map((item) => {
        const dashboardAsBack =
          dashboardTabAsBack && item.href === '/dashboard/'
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
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 sm:gap-1.5 touch-manipulation"
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

  if (!mounted) {
    return null
  }

  return createPortal(nav, document.body)
}
