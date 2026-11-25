import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = pageMetadata(
  '/picks/',
  'Picks | Banger Picks',
  'Choose and save your match predictions'
)

export default function PicksLayout({ children }: { children: React.ReactNode }) {
  return children
}