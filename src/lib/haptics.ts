function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || prefersReducedMotion()) return
  if (typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(pattern)
  } catch {
    // ignored — vibrate is optional
  }
}

/** Light tap when a pick is selected */
export function pickLight(): void {
  vibrate(12)
}

/** Success pattern when all picks are saved */
export function pickSuccess(): void {
  vibrate([20, 40, 28])
}

/** Short pulse when save fails */
export function pickError(): void {
  vibrate([30, 50, 30])
}