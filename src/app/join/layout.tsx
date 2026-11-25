import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = pageMetadata('/join/', 'Join | Banger Picks')

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children
}