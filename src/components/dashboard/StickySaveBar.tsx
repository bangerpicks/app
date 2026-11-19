import type { ReactNode } from 'react'

interface StickySaveBarProps {
  children: ReactNode
}

export function StickySaveBar({ children }: StickySaveBarProps) {
  return (
    <div
      className="lg:hidden fixed inset-x-0 z-[40] border-t border-ivory/15 bg-midnight-violet"
      style={{
        bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="mx-auto w-full max-w-md px-4 sm:px-5 py-2">{children}</div>
    </div>
  )
}