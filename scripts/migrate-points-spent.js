/**
 * Backfill users.pointsSpent from non-cancelled redemptions.
 *
 * Default is a dry-run that prints the diff and writes nothing.
 * Writes:
 *   node scripts/migrate-points-spent.js --apply --project banger-picks
 * Emulator:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-points-spent.js --apply --project demo-banger-picks
 *
 * Never lowers an existing pointsSpent (uses max(existing, computed)).
 * Sets the field when it is missing, including 0, so redemptions are not frozen.
 * Skips redemption userIds that have no user document and reports them.
 * Does not create user documents. Not run by deploy.
 */

const { parseMigrateArgs, assertMigrateAllowed } = require('./migrate-guard')

function computedSpend(redemptions) {
  const spentByUser = new Map()
  redemptions.forEach((snapshot) => {
    const data = snapshot.data() || {}
    if (data.status === 'cancelled') return
    const uid = data.userId
    const cost = data.pointsCost
    if (typeof uid !== 'string' || uid.length === 0) return
    if (typeof cost !== 'number' || !Number.isFinite(cost) || cost <= 0) return
    spentByUser.set(uid, (spentByUser.get(uid) || 0) + cost)
  })
  return spentByUser
}

async function migratePointsSpent({ db, apply, log = console.log }) {
  const redemptions = await db.collection('redemptions').get()
  const users = await db.collection('users').get()
  const spentByUser = computedSpend(redemptions)
  const userIds = new Set(users.docs.map((snapshot) => snapshot.id))
  const orphans = []

  for (const uid of spentByUser.keys()) {
    if (!userIds.has(uid)) orphans.push(uid)
  }
  orphans.sort()
  for (const uid of orphans) {
    log(`ORPHAN redemptions for missing user ${uid} computed=${spentByUser.get(uid)} skipped`)
  }

  const changes = []
  let batch = db.batch()
  let pending = 0

  async function queue(ref, pointsSpent) {
    changes.push({ id: ref.id, pointsSpent })
    if (!apply) return
    batch.set(ref, { pointsSpent }, { merge: true })
    pending += 1
    if (pending === 400) {
      await batch.commit()
      batch = db.batch()
      pending = 0
    }
  }

  for (const snapshot of users.docs) {
    const data = snapshot.data() || {}
    const computed = spentByUser.get(snapshot.id) || 0
    const hasField = Object.prototype.hasOwnProperty.call(data, 'pointsSpent')
    const existing = hasField ? data.pointsSpent : undefined

    let next = computed
    if (hasField && typeof existing === 'number' && Number.isFinite(existing)) {
      next = Math.max(existing, computed)
      if (next === existing) {
        log(`UNCHANGED users/${snapshot.id} pointsSpent=${existing} computed=${computed}`)
        continue
      }
      log(`CHANGE users/${snapshot.id} pointsSpent ${existing} -> ${next} (max of existing and computed ${computed})`)
    } else if (!hasField) {
      log(`CHANGE users/${snapshot.id} pointsSpent missing -> ${next}`)
    } else {
      log(`CHANGE users/${snapshot.id} pointsSpent ${existing} -> ${next} (existing was not a number)`)
    }

    await queue(snapshot.ref, next)
  }

  if (apply && pending > 0) {
    await batch.commit()
  }

  log(
    `${apply ? 'APPLY' : 'DRY-RUN'} pointsSpent changes=${changes.length} orphans=${orphans.length} users=${users.size} redemptions=${redemptions.size}`
  )
  return { changes, orphans, users: users.size, redemptions: redemptions.size }
}

async function main() {
  const args = parseMigrateArgs(process.argv.slice(2))
  if (args.help) {
    console.log('Usage: node scripts/migrate-points-spent.js [--dry-run | --apply --project banger-picks]')
    return
  }
  assertMigrateAllowed(args)
  const admin = require('../functions/node_modules/firebase-admin')
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: args.project || process.env.GCLOUD_PROJECT || 'demo-banger-picks' })
  }
  await migratePointsSpent({ db: admin.firestore(), apply: args.apply })
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = { migratePointsSpent, computedSpend }
