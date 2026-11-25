import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = pageMetadata(
  '/rankings/',
  'Leaderboards | Banger Picks',
  'Weekly and season leaderboards'
)

export default function RankingsLayout({ children }: { children: React.ReactNode }) {
  return children
}