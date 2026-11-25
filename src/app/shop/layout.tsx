import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = pageMetadata(
  '/shop/',
  'Shop | Banger Picks',
  'Redeem points for rewards'
)

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children
}