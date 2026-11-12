import type { MarketOddsSnapshot } from '@/types/dashboard'

/** Whether the match card should show the market odds bar. */
export function hasDisplayableMarketOdds(
  marketOdds: MarketOddsSnapshot | undefined
): boolean {
  if (!marketOdds) return false
  const { impliedPercents, decimalOdds, bookmakerName } = marketOdds
  if (!bookmakerName?.trim()) return false
  const nums = [
    impliedPercents?.home,
    impliedPercents?.draw,
    impliedPercents?.away,
    decimalOdds?.home,
    decimalOdds?.draw,
    decimalOdds?.away,
  ]
  return nums.every((n) => typeof n === 'number' && Number.isFinite(n))
}

export function formatDecimalOddsDisplay(odd: number): string {
  if (odd >= 10) {
    return odd.toFixed(2)
  }
  if (odd >= 2) {
    return odd.toFixed(2)
  }
  return odd.toFixed(2)
}
