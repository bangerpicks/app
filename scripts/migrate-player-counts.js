/**
 * Backfill public player counts so the signed-out dashboard does not read entries.
 *
 * predictions/{fixtureId}.playerCount = number of entries.
 * gameweeks/{id}.playerCount = unique uids across that gameweek's fixtures.
 *
 * Never lowers an existing count (max(existing, computed)). Sets the field when
 * missing, including 0. Default is dry-run.
 *
 *   node scripts/migrate-player-counts.js --apply --project banger-picks
 *
 * Not run by deploy.
 */

const { parseMigrateArgs, assertMigrateAllowed } = require('./migrate-guard')

function nextCount(existing, computed) {
  if (typeof existing === 'number' && Number.isFinite(existing)) {
    return Math.max(existing, computed)
  }
  return computed
}

async function migratePlayerCounts({ db, apply, log = console.log }) {
  const predictionDocs = await db.collection('predictions').get()
  const changes = []
  let batch = db.batch()
  let pending = 0

  async function queue(ref, playerCount, label, existing) {
    changes.push({ path: ref.path, playerCount })
    log(`CHANGE ${label} playerCount ${existing === undefined ? 'missing' : existing} -> ${playerCount}`)
    if (!apply) return
    batch.set(ref, { playerCount }, { merge: true })
    pending += 1
    if (pending === 400) {
      await batch.commit()
      batch = db.batch()
      pending = 0
    }
  }

  const entriesByFixture = new Map()

  for (const snapshot of predictionDocs.docs) {
    const entries = await snapshot.ref.collection('entries').get()
    const uids = entries.docs.map((entry) => entry.id)
    entriesByFixture.set(snapshot.id, uids)
    const computed = uids.length
    const existing = snapshot.data().playerCount
    const next = nextCount(existing, computed)
    if (next === existing) {
      log(`UNCHANGED predictions/${snapshot.id} playerCount=${existing}`)
      continue
    }
    await queue(snapshot.ref, next, `predictions/${snapshot.id}`, existing)
  }

  const gameweeks = await db.collection('gameweeks').get()
  for (const snapshot of gameweeks.docs) {
    const fixtureIds = Array.isArray(snapshot.data().fixtureIds) ? snapshot.data().fixtureIds : []
    const uids = new Set()
    for (const fixtureId of fixtureIds) {
      const known = entriesByFixture.get(String(fixtureId))
      const ids = known || (await db.collection('predictions').doc(String(fixtureId)).collection('entries').get()).docs.map((entry) => entry.id)
      ids.forEach((uid) => uids.add(uid))
    }
    const computed = uids.size
    const existing = snapshot.data().playerCount
    const next = nextCount(existing, computed)
    if (next === existing) {
      log(`UNCHANGED gameweeks/${snapshot.id} playerCount=${existing}`)
      continue
    }
    await queue(snapshot.ref, next, `gameweeks/${snapshot.id}`, existing)
  }

  if (apply && pending > 0) {
    await batch.commit()
  }

  log(`${apply ? 'APPLY' : 'DRY-RUN'} playerCount changes=${changes.length}`)
  return { changes }
}

async function main() {
  const args = parseMigrateArgs(process.argv.slice(2))
  if (args.help) {
    console.log('Usage: node scripts/migrate-player-counts.js [--dry-run | --apply --project banger-picks]')
    return
  }
  assertMigrateAllowed(args)
  const admin = require('../functions/node_modules/firebase-admin')
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: args.project || process.env.GCLOUD_PROJECT || 'demo-banger-picks' })
  }
  await migratePlayerCounts({ db: admin.firestore(), apply: args.apply })
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = { migratePlayerCounts, nextCount }
