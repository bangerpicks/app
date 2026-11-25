/**
 * One-shot: set settings/app.defaultLeagueIds in Firestore (Admin SDK).
 * Usage: node scripts/seed-default-league-settings.js
 */
const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp()
}

const DEFAULT_LEAGUE_IDS = ['banger-world', 'midweek-mayhem', 'liguilla-loca']

async function main() {
  const db = admin.firestore()
  await db.doc('settings/app').set(
    { defaultLeagueIds: DEFAULT_LEAGUE_IDS },
    { merge: true }
  )
  console.log('Set defaultLeagueIds:', DEFAULT_LEAGUE_IDS.join(', '))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})