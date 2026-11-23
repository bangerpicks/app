/**
 * Local ops runner (needs Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS).
 *
 *   node scripts/run-all-ops-backfills.mjs --dry-run
 *   node scripts/run-all-ops-backfills.mjs --execute
 */
import { getDb, initAdmin } from './ops-admin-init.mjs'

function slimFixture(full) {
  if (!full || typeof full !== 'object') return full
  return {
    fixture: full.fixture,
    league: full.league,
    teams: full.teams,
    goals: full.goals,
    score: full.score,
  }
}

const execute = process.argv.includes('--execute')
const dryRun = !execute

async function slimFixtures(db) {
  let updated = 0
  const gameweeks = await db.collection('gameweeks').get()
  for (const gw of gameweeks.docs) {
    const fixtures = await gw.ref.collection('fixtures').get()
    let batch = db.batch()
    let n = 0
    for (const f of fixtures.docs) {
      const full = f.data().fixture
      if (!full) continue
      const slimmed = slimFixture(full)
      if (JSON.stringify(full).length <= JSON.stringify(slimmed).length + 50) continue
      if (!dryRun) batch.update(f.ref, { fixture: slimmed })
      updated++
      n++
      if (!dryRun && n >= 400) {
        await batch.commit()
        batch = db.batch()
        n = 0
      }
    }
    if (!dryRun && n > 0) await batch.commit()
    console.log('slimFixtures', gw.id, updated)
  }
  return updated
}

async function displayNames(db) {
  let updated = 0
  const users = await db.collection('users').get()
  let batch = db.batch()
  let n = 0
  for (const userDoc of users.docs) {
    const name = userDoc.data().displayName?.trim()
    if (!name) continue
    const ref = db.collection('displayNames').doc(name.toLowerCase())
    if (!dryRun) batch.set(ref, { uid: userDoc.id }, { merge: true })
    updated++
    n++
    if (!dryRun && n >= 400) {
      await batch.commit()
      batch = db.batch()
      n = 0
    }
  }
  if (!dryRun && n > 0) await batch.commit()
  console.log('displayNames', updated)
  return updated
}

async function crowdCounters(db) {
  let updated = 0
  const preds = await db.collection('predictions').get()
  for (const pred of preds.docs) {
    const entries = await pred.ref.collection('entries').get()
    const counts = { H: 0, D: 0, A: 0, total: 0 }
    entries.forEach((e) => {
      const pick = e.data().pick
      if (pick === 'H' || pick === 'D' || pick === 'A') {
        counts[pick]++
        counts.total++
      }
    })
    if (counts.total === 0) continue
    if (!dryRun) await pred.ref.set({ crowdPickCounts: counts }, { merge: true })
    updated++
  }
  console.log('crowdCounters', updated)
  return updated
}

async function standingsMeta(db) {
  let updated = 0
  const admin = await import('firebase-admin')
  const gameweeks = await db.collection('gameweeks').get()
  for (const gw of gameweeks.docs) {
    const data = gw.data()
    if (!data.standings) continue
    const metaRef = gw.ref.collection('meta').doc('standings')
    if ((await metaRef.get()).exists) continue
    if (!dryRun) {
      await metaRef.set({
        standings: data.standings,
        standingsFetchedAt: data.standingsFetchedAt ?? null,
      })
      await gw.ref.update({
        standings: admin.firestore.FieldValue.delete(),
        standingsFetchedAt: admin.firestore.FieldValue.delete(),
      })
    }
    updated++
  }
  console.log('standingsMeta', updated)
  return updated
}

try {
  initAdmin()
  const db = getDb()
  console.log(dryRun ? 'DRY RUN (pass --execute to write)' : 'EXECUTING WRITES')
  await slimFixtures(db)
  await displayNames(db)
  await crowdCounters(db)
  await standingsMeta(db)
  console.log('done')
} catch (e) {
  console.error(e.message)
  process.exit(1)
}