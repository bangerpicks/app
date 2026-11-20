/**
 * Create flagship `banger-world` competition and set gameweeks.competitionId.
 *
 * Usage: node scripts/backfill-competitions.js [--dry-run]
 */

const admin = require('firebase-admin')

const COMPETITION_ID = 'banger-world'
const DRY = process.argv.includes('--dry-run')

function initAdmin() {
  if (admin.apps.length) return
  admin.initializeApp()
}

async function main() {
  initAdmin()
  const db = admin.firestore()
  const now = admin.firestore.FieldValue.serverTimestamp()

  let activeSeasonId = null
  const seasons = await db.collection('seasons').where('status', '==', 'active').limit(1).get()
  if (!seasons.empty) {
    activeSeasonId = seasons.docs[0].id
  }

  let activeGameweekId = null
  const activeGws = await db.collection('gameweeks').where('status', '==', 'active').get()
  for (const docSnap of activeGws.docs) {
    const data = docSnap.data()
    const type = data.type
    if (!type || type === 'banger-week' || type === 'flagship') {
      activeGameweekId = docSnap.id
      break
    }
  }

  const competition = {
    displayName: 'Banger World',
    displayName_esMX: 'Banger World',
    displayNameSearch: 'banger world',
    kind: 'flagship',
    visibility: 'public',
    featured: true,
    featuredRank: 0,
    status: 'active',
    memberCount: 0,
    activeGameweekId,
    activeSeasonId,
    joinCodeEnabled: false,
    searchKeywords: ['banger', 'world', 'weekend'],
    createdAt: now,
    updatedAt: now,
  }

  console.log(DRY ? '[dry-run] would set competitions/banger-world' : 'Writing competition…')
  if (!DRY) {
    await db.collection('competitions').doc(COMPETITION_ID).set(competition, { merge: true })
  }

  const allGws = await db.collection('gameweeks').get()
  const batch = db.batch()
  let pending = 0
  for (const docSnap of allGws.docs) {
    const data = docSnap.data()
    const type = data.type
    let competitionId = data.competitionId
    if (!competitionId) {
      if (type === 'league') competitionId = `league-${docSnap.id}`
      else if (type === 'cup') competitionId = `cup-${docSnap.id}`
      else competitionId = COMPETITION_ID
      batch.update(docSnap.ref, { competitionId, updatedAt: now })
      pending++
    }
  }
  if (pending > 0) {
    console.log(DRY ? `[dry-run] would patch ${pending} gameweeks` : `Patching ${pending} gameweeks…`)
    if (!DRY) await batch.commit()
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})