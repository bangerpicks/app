'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** On client navigations, clear modal scroll locks and stray full-screen overlays. */
export function RouteChromeReset() {
  const pathname = usePathname()

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.style.removeProperty('overflow')
    html.style.removeProperty('padding-right')
    body.style.removeProperty('overflow')
    body.style.removeProperty('padding-right')

    const onDashboard = pathname === '/dashboard' || pathname === '/dashboard/'
    if (!onDashboard) {
      document.querySelectorAll('body > div[aria-labelledby="onboarding-title"]').forEach((node) => {
        node.remove()
      })
    }

    const navBars = document.querySelectorAll('nav[data-bottom-nav]')
    navBars.forEach((node, index) => {
      if (index > 0) node.remove()
    })

    const headers = document.querySelectorAll('header[data-app-header]')
    headers.forEach((node, index) => {
      if (index > 0) node.remove()
    })

    const onPicksOrDiscover =
      pathname === '/picks' ||
      pathname.startsWith('/picks/') ||
      pathname === '/discover' ||
      pathname.startsWith('/discover/')
    if (onPicksOrDiscover) {
      document
        .querySelectorAll('body > div[aria-labelledby="onboarding-title"]')
        .forEach((node) => node.remove())
    }
  }, [pathname])

  return null
}