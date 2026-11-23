'use client'

import type { ReactNode, Ref } from 'react'
import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { usePageChromeScrollUnlock } from './usePageChromeScrollUnlock'

interface AppShellProps {
  children: ReactNode
  username?: string
  userPhotoUrl?: string
  mainClassName?: string
  /** Optional shell wrapper classes (e.g. lock viewport height on rankings). */
  shellClassName?: string
  banner?: ReactNode
  containerRef?: Ref<HTMLDivElement>
  footer?: ReactNode
}

const defaultMainClassName =
  'flex-1 px-4 sm:px-5 pb-bottom-nav overflow-x-hidden'

export function AppShell({
  children,
  username,
  userPhotoUrl,
  mainClassName,
  shellClassName,
  banner,
  containerRef,
  footer,
}: AppShellProps) {
  usePageChromeScrollUnlock()

  return (
    <div
      ref={containerRef}
      className={`relative min-h-[100dvh] min-h-screen bg-midnight-violet flex flex-col min-h-0 ${
        shellClassName ?? ''
      }`}
    >
      <Header username={username} userPhotoUrl={userPhotoUrl} />
      {banner}
      <main className={`relative z-0 ${mainClassName ?? defaultMainClassName}`}>
        {children}
      </main>
      {footer}
      <BottomNavigation />
    </div>
  )
}
