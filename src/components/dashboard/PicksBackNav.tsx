import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface PicksBackNavProps {
  href: string
  children: ReactNode
}

const linkClassName =
  'inline-flex items-center gap-1 text-sm font-semibold text-lime-yellow hover:text-lime-yellow/85 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-yellow'

/** Desktop-only back link; mobile uses the dynamic Dashboard tab in bottom nav. */
export function PicksBackNav({ href, children }: PicksBackNavProps) {
  return (
    <div className="hidden lg:block w-full border-b border-ivory/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-5 py-2">
        <a href={href} className={linkClassName}>
          <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          <span>{children}</span>
        </a>
      </div>
    </div>
  )
}