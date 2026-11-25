import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = pageMetadata('/profile/', 'Profile | Banger Picks')

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}