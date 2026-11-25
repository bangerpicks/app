export const DEFAULT_LEAGUE_IDS = ['banger-world', 'midweek-mayhem', 'liguilla-loca'] as const

export async function resolveDefaultLeagueIds(
  db: FirebaseFirestore.Firestore
): Promise<string[]> {
  const snap = await db.doc('settings/app').get()
  const fromSettings = snap.data()?.defaultLeagueIds
  if (Array.isArray(fromSettings) && fromSettings.length > 0) {
    return fromSettings
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim())
  }
  return [...DEFAULT_LEAGUE_IDS]
}