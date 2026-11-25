import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = pageMetadata(
  '/discover/',
  'Discover | Banger Picks',
  'Browse public competitions'
)

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children
}