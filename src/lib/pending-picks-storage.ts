import type { Prediction } from '@/types/dashboard'

const PICKS_KEY_PREFIX = 'banger-picks:pending-picks:'
const SAVE_INTENT_KEY = 'banger-picks:save-after-sign-in'

type StoredPicksPayload = {
  gameweekId: string
  picks: Record<string, Prediction>
}

type SaveIntentPayload = {
  gameweekId: string
  at: number
}

function picksKey(gameweekId: string) {
  return `${PICKS_KEY_PREFIX}${gameweekId}`
}

function isPrediction(value: unknown): value is Prediction {
  return value === 'H' || value === 'D' || value === 'A'
}

export function savePendingPicksToSession(gameweekId: string, picks: Map<number, Prediction>): void {
  if (typeof window === 'undefined') return
  const record: Record<string, Prediction> = {}
  picks.forEach((prediction, fixtureId) => {
    record[String(fixtureId)] = prediction
  })
  const payload: StoredPicksPayload = { gameweekId, picks: record }
  sessionStorage.setItem(picksKey(gameweekId), JSON.stringify(payload))
}

export function loadPendingPicksFromSession(gameweekId: string): Map<number, Prediction> | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(picksKey(gameweekId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredPicksPayload
    if (parsed.gameweekId !== gameweekId || !parsed.picks) return null
    const map = new Map<number, Prediction>()
    for (const [key, value] of Object.entries(parsed.picks)) {
      const fixtureId = Number(key)
      if (!Number.isFinite(fixtureId) || !isPrediction(value)) continue
      map.set(fixtureId, value)
    }
    return map.size > 0 ? map : null
  } catch {
    return null
  }
}

export function clearPendingPicksSession(gameweekId: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(picksKey(gameweekId))
}

export function setSaveAfterSignInIntent(gameweekId: string): void {
  if (typeof window === 'undefined') return
  const payload: SaveIntentPayload = { gameweekId, at: Date.now() }
  sessionStorage.setItem(SAVE_INTENT_KEY, JSON.stringify(payload))
}

export function consumeSaveAfterSignInIntent(gameweekId: string): boolean {
  if (typeof window === 'undefined') return false
  const raw = sessionStorage.getItem(SAVE_INTENT_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as SaveIntentPayload
    if (parsed.gameweekId !== gameweekId) return false
    sessionStorage.removeItem(SAVE_INTENT_KEY)
    return true
  } catch {
    sessionStorage.removeItem(SAVE_INTENT_KEY)
    return false
  }
}
