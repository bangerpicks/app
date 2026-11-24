'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { HeaderActions } from './HeaderActions'
import { DesktopHeaderNav } from './DesktopHeaderNav'

interface HeaderChromeProps {
  logoUrl?: string
  username?: string
  userPhotoUrl?: string
}

/** Viewport-fixed header (portaled) so picks/gameweek pages do not trap header clicks in stacking contexts. */
export function HeaderChrome({
  logoUrl = '/logo.svg',
  username,
  userPhotoUrl,
}: HeaderChromeProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => {
      document.querySelectorAll('header[data-app-header]').forEach((node) => node.remove())
    }
  }, [])

  const header = (
    <header
      data-app-header
      className="fixed top-0 left-0 right-0 z-[130] min-h-16 bg-midnight-violet px-4 sm:px-5 py-2 flex items-center gap-3 pointer-events-auto"
      style={{
        minHeight: 'calc(var(--header-height) + env(safe-area-inset-top, 0px))',
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <Link href="/dashboard/" className="flex items-center flex-shrink-0 touch-manipulation">
        <Image
          src={logoUrl}
          alt="Banger Picks Logo"
          width={156}
          height={40}
          priority
          className="object-contain w-[108px] h-[27.7px] sm:w-[140px] sm:h-[36px]"
        />
      </Link>
      <DesktopHeaderNav />
      <HeaderActions username={username} userPhotoUrl={userPhotoUrl} />
    </header>
  )

  if (!mounted) {
    return null
  }

  return createPortal(header, document.body)
}

/** In-flow spacer matching fixed header height */
export function HeaderChromeSpacer() {
  return (
    <div
      className="w-full shrink-0 pointer-events-none"
      style={{ height: 'calc(var(--header-height) + env(safe-area-inset-top, 0px))' }}
      aria-hidden
    />
  )
}