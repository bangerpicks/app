'use client'

import { useEffect, useState } from 'react'

/** Keep fixed bottom chrome aligned with the mobile visual viewport (keyboard / dynamic toolbars). */
export function useVisualViewportBottomInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const sync = () => {
      const gap = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height))
      setInset(gap)
    }

    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)

    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])

  return inset
}