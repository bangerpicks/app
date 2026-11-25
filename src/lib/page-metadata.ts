import type { Metadata } from 'next'
import { getSiteOrigin } from '@/lib/site-url'

export function pageMetadata(path: string, title?: string, description?: string): Metadata {
  const canonicalPath = path.startsWith('/') ? path : `/${path}`
  const normalized = canonicalPath.endsWith('/') ? canonicalPath : `${canonicalPath}/`
  return {
    title,
    description,
    alternates: {
      canonical: normalized,
    },
    openGraph: {
      url: normalized,
    },
  }
}

export function absoluteCanonical(path: string): string {
  const normalized = path.endsWith('/') ? path : `${path}/`
  return `${getSiteOrigin()}${normalized}`
}