import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = pageMetadata('/settings/', 'Settings | Banger Picks')

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children
}