import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = pageMetadata(
  '/dashboard/',
  'Home | Banger Picks',
  'Featured competitions and your picks dashboard'
)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}