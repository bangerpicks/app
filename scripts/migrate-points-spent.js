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

function parseCost(raw) {
  if (typeof raw === 'number' && Number.isInteger(raw)) {
    if (raw > 0) return { cost: raw }
    return { skip: `non-positive integer cost ${raw}` }
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    const asNumber = Number(trimmed)
    if (trimmed === '' || !Number.isFinite(asNumber)) {
      return { skip: `invalid string cost ${JSON.stringify(raw)}` }
    }
    if (Number.isInteger(asNumber)) {
      if (asNumber <= 0) return { skip: `non-positive string cost ${JSON.stringify(raw)}` }
      return {
        cost: asNumber,
        warning: `string cost ${JSON.stringify(raw)} coerced with Number() to integer ${asNumber}`,
      }
    }
    const rounded = Math.round(asNumber)
    if (rounded <= 0) return { skip: `string cost ${JSON.stringify(raw)} rounds to ${rounded}` }
    return {
      cost: rounded,
      warning: `string cost ${JSON.stringify(raw)} rounded to integer ${rounded}`,
    }
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const rounded = Math.round(raw)
    if (rounded <= 0) return { skip: `cost ${raw} rounds to ${rounded}` }
    return { cost: rounded, warning: `non-integer cost ${raw} rounded to integer ${rounded}` }
  }
  return { skip: `invalid cost ${JSON.stringify(raw)}` }
}

function classifyRedemptions(redemptions) {
  const spentByUser = new Map()
  const skipped = []
  const warnings = []
  redemptions.forEach((snapshot) => {
    const data = snapshot.data() || {}
    if (data.status === 'cancelled') return
    const uid = data.userId
    if (typeof uid !== 'string' || uid.length === 0) {
      skipped.push({ id: snapshot.id, reason: 'missing userId' })
      return
    }
    const parsed = parseCost(data.pointsCost)
    if (parsed.skip) {
      skipped.push({ id: snapshot.id, userId: uid, reason: parsed.skip })
      return
    }
    if (parsed.warning) warnings.push({ id: snapshot.id, userId: uid, warning: parsed.warning })
    spentByUser.set(uid, (spentByUser.get(uid) || 0) + parsed.cost)
  })
  return { spentByUser, skipped, warnings }
}

function failureCode(result, allowSkips) {
  const problems = (result.skipped || []).length + (result.orphans || []).length
  return problems > 0 && !allowSkips ? 1 : 0
}

async function migratePointsSpent({ db, apply, allowSkips = false, log = console.log }) {
  const redemptions = await db.collection('redemptions').get()
  const users = await db.collection('users').get()
  const { spentByUser, skipped, warnings } = classifyRedemptions(redemptions)
  const userIds = new Set(users.docs.map((snapshot) => snapshot.id))
  const orphans = []

  for (const uid of spentByUser.keys()) {
    if (!userIds.has(uid)) orphans.push(uid)
  }
  orphans.sort()
  for (const uid of orphans) {
    log(`ORPHAN redemptions for missing user ${uid} computed=${spentByUser.get(uid)} skipped`)
  }
  for (const item of skipped) {
    log(`SKIP redemption ${item.id} user=${item.userId || '-'} ${item.reason}`)
  }
  for (const item of warnings) {
    log(`WARNING redemption ${item.id} ${item.warning}`)
  }

  const blocked = failureCode({ skipped, orphans }, allowSkips) === 1
  if (blocked) {
    log(
      `REFUSING to ${apply ? 'apply' : 'treat this as a clean dry-run'}: ${skipped.length} invalid redemption(s), ${orphans.length} orphan user id(s). Re-run with --allow-skips to proceed.`
    )
  }

  const changes = []
  let batch = db.batch()
  let pending = 0

  async function queue(ref, pointsSpent) {
    changes.push({ id: ref.id, pointsSpent })
    if (!apply || blocked) return
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

  if (apply && !blocked && pending > 0) {
    await batch.commit()
  }

  const result = {
    changes: blocked ? [] : changes,
    orphans,
    skipped,
    warnings,
    applied: apply && !blocked,
    users: users.size,
    redemptions: redemptions.size,
  }
  log(
    `${result.applied ? 'APPLY' : 'DRY-RUN'} pointsSpent changes=${result.changes.length} orphans=${orphans.length} skipped=${skipped.length} warnings=${warnings.length} users=${users.size} redemptions=${redemptions.size}`
  )
  return result
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
  const result = await migratePointsSpent({
    db: admin.firestore(),
    apply: args.apply,
    allowSkips: args.allowSkips,
  })
  if (failureCode(result, args.allowSkips) !== 0) {
    process.exitCode = 1
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = { migratePointsSpent, parseCost, classifyRedemptions, failureCode }
