'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LayoutDashboard, Trophy, ShoppingBag, User } from 'lucide-react'

interface NavItem {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>
  labelKey: string
  href: string
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: 'navigation.dashboard', href: '/dashboard' },
  { icon: Trophy, labelKey: 'navigation.rankings', href: '/rankings' },
  { icon: ShoppingBag, labelKey: 'navigation.shop', href: '/shop' },
  { icon: User, labelKey: 'navigation.profile', href: '/profile' },
]

export function BottomNavigation() {
  const pathname = usePathname()
  const t = useTranslations()

  return (
    <nav 
      className="sticky bottom-0 z-10 h-[100px] bg-lime-yellow rounded-t-[10px] px-2 sm:px-5 py-2.5 flex items-center justify-between"
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        const label = t(item.labelKey)

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1.5 sm:gap-2.5"
            aria-label={label}
          >
            <Icon
              size={32}
              className={`text-midnight-violet w-8 h-8 sm:w-[38px] sm:h-[38px] ${isActive ? 'opacity-100' : 'opacity-70'}`}
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
