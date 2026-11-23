'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface StickySaveBarProps {
  children: ReactNode
}

export function StickySaveBar({ children }: StickySaveBarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const bar = (
    <div
      className="lg:hidden fixed inset-x-0 z-[90] pointer-events-none"
      style={{
        bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md border-t border-ivory/15 bg-midnight-violet px-4 sm:px-5 py-2">
        {children}
      </div>
    </div>
  )

  if (!mounted) {
    return null
  }

  return createPortal(bar, document.body)
}