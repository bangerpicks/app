import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = pageMetadata(
  '/my-games/',
  'My Games | Banger Picks',
  'Your saved leagues and cups—weekly picks before the deadline'
)

export default function CompetitionsLayout({ children }: { children: React.ReactNode }) {
  return children
}