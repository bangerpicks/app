'use client'

import { useEffect } from 'react'

/** Clear scroll locks left by sign-in / onboarding modals after client-side route changes. */
export function usePageChromeScrollUnlock() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.style.overflow = ''
    html.style.paddingRight = ''
    body.style.overflow = ''
    body.style.paddingRight = ''
  }, [])
}