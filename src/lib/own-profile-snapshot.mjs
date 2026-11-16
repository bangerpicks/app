/**
 * Normalize users/{uid} doc fields for the shared profile loader (unit-testable).
 */

/**
 * @param {import('firebase/firestore').DocumentData | undefined} data
 * @returns {Record<string, unknown> | null}
 */
export function snapshotFromUserDocData(data) {
  if (!data || typeof data !== 'object') {
    return null
  }
  return {
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    hasSeenOnboardingIntro: data.hasSeenOnboardingIntro === true,
    photoURL: data.photoURL ?? null,
    points: data.points ?? 0,
    totalPredictions: data.totalPredictions ?? 0,
    correctPredictions: data.correctPredictions ?? 0,
    accuracy: data.accuracy ?? 0,
    favoriteTeam: data.favoriteTeam ?? null,
    favoritePlayer: data.favoritePlayer ?? null,
    referralPoints: data.referralPoints ?? 0,
    pointsSpent: data.pointsSpent ?? 0,
    weekWins1st: data.weekWins1st ?? 0,
    weekWins2nd: data.weekWins2nd ?? 0,
    weekWins3rd: data.weekWins3rd ?? 0,
    seasonTitles: data.seasonTitles ?? 0,
    seasonPodiums: data.seasonPodiums ?? 0,
  }
}