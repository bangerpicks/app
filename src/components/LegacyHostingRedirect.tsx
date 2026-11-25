'use client'

import { useEffect } from 'react'
import { getSiteOrigin } from '@/lib/site-url'

/**
 * Sends legacy Firebase Hosting URLs to the canonical domain (skip Firebase Auth paths).
 */
export function LegacyHostingRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const { hostname, pathname, search, hash } = window.location
    const isLegacy =
      hostname.endsWith('.web.app') || hostname.endsWith('.firebaseapp.com')
    if (!isLegacy) return
    if (pathname.startsWith('/__/auth') || pathname.startsWith('/__/firebase')) return
    const target = getSiteOrigin()
    if (hostname === new URL(target).hostname) return
    window.location.replace(`${target}${pathname}${search}${hash}`)
  }, [])
  return null
}