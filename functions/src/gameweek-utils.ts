/**
 * Pure helpers for gameweek lifecycle (testable without Firestore).
 */

export function isFlagshipGameweek(data: { type?: string } | undefined): boolean {
  const t = data?.type
  if (!t || t === 'banger-week' || t === 'flagship') {
    return true
  }
  return false
}

/** Podium bonuses only on the first active → completed transition, once per gameweek. */
export function shouldAwardPodiumBonuses(
  prevStatus: unknown,
  newStatus: unknown,
  podiumAwardedAt: unknown
): boolean {
  if (newStatus !== 'completed') {
    return false
  }
  if (prevStatus !== 'active') {
    return false
  }
  if (podiumAwardedAt != null) {
    return false
  }
  return true
}

/** When a flagship week becomes active, demote other active flagship weeks. */
export function shouldEnforceSingleActiveFlagshipOnWrite(
  prevStatus: unknown,
  newStatus: unknown,
  data: { type?: string } | undefined
): boolean {
  if (newStatus !== 'active') {
    return false
  }
  if (!isFlagshipGameweek(data)) {
    return false
  }
  if (prevStatus === 'active') {
    return false
  }
  return true
}
