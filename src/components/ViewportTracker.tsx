'use client'

import { useEffect } from 'react'

export function ViewportTracker() {
  useEffect(() => {
    const handleVisualViewportChange = () => {
      // Viewport change handler
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange)
      window.visualViewport.addEventListener('scroll', handleVisualViewportChange)
    }


    // Prevent bounce/overscroll on iOS - only at boundaries
    let initialTouchY = 0
    let lastTouchY = 0

    const handleTouchStartBounce = (e: TouchEvent) => {
      initialTouchY = e.touches[0].clientY
      lastTouchY = initialTouchY
    }

    const preventBounce = (e: TouchEvent) => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight
      const clientHeight = window.innerHeight || document.documentElement.clientHeight
      const isAtTop = scrollTop <= 1
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1
      const currentY = e.touches[0]?.clientY || 0
      const deltaY = currentY - lastTouchY
      lastTouchY = currentY

      // Only prevent if at boundary and trying to overscroll
      if (isAtTop && deltaY > 0) {
        e.preventDefault()
        return false
      }
      if (isAtBottom && deltaY < 0) {
        e.preventDefault()
        return false
      }
    }

    // Only apply on iOS/Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    if (isIOS) {
      document.addEventListener('touchstart', handleTouchStartBounce, { passive: true })
      document.addEventListener('touchmove', preventBounce, { passive: false })
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange)
        window.visualViewport.removeEventListener('scroll', handleVisualViewportChange)
      }
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      if (isIOS) {
        document.removeEventListener('touchstart', handleTouchStartBounce)
        document.removeEventListener('touchmove', preventBounce)
      }
    }
  }, [])

  return null
}
