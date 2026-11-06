/**
 * Rebuild customization.optionsById from playerOptions on every favorite-player
 * shop item. Comparison is by value, not by key count.
 *
 * Default is a dry-run. Writes:
 *   node scripts/migrate-shop-options-by-id.js --apply --project banger-picks
 * Emulator:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-shop-options-by-id.js --apply --project demo-banger-picks
 *
 * Not run by deploy. Admin saves already write optionsById.
 */

const { parseMigrateArgs, assertMigrateAllowed, sameValue } = require('./migrate-guard')

function optionsByIdFrom(playerOptions) {
  const optionsById = {}
  if (!Array.isArray(playerOptions)) return optionsById
  for (const option of playerOptions) {
    if (!option || option.playerId == null) continue
    optionsById[String(option.playerId)] = option
  }
  return optionsById
}

async function migrateShopOptionsById({ db, apply, log = console.log }) {
  const items = await db.collection('shopItems').get()
  const changes = []
  let batch = db.batch()
  let pending = 0

  for (const snapshot of items.docs) {
    const data = snapshot.data() || {}
    const customization = data.customization
    if (!customization || customization.type !== 'favoritePlayer') continue
    if (!Array.isArray(customization.playerOptions)) {
      log(`SKIP shopItems/${snapshot.id} favoritePlayer item has no playerOptions array`)
      continue
    }

    const rebuilt = optionsByIdFrom(customization.playerOptions)
    const existing = customization.optionsById
    if (sameValue(existing, rebuilt)) {
      log(`UNCHANGED shopItems/${snapshot.id} optionsById`)
      continue
    }

    log(
      `CHANGE shopItems/${snapshot.id} optionsById ${JSON.stringify(existing ?? null)} -> ${JSON.stringify(rebuilt)}`
    )
    changes.push({ id: snapshot.id, optionsById: rebuilt })
    if (!apply) continue

    batch.update(snapshot.ref, { 'customization.optionsById': rebuilt })
    pending += 1
    if (pending === 400) {
      await batch.commit()
      batch = db.batch()
      pending = 0
    }
  }

  if (apply && pending > 0) {
    await batch.commit()
  }

  log(`${apply ? 'APPLY' : 'DRY-RUN'} optionsById changes=${changes.length} shopItems=${items.size}`)
  return { changes, shopItems: items.size }
}

async function main() {
  const args = parseMigrateArgs(process.argv.slice(2))
  if (args.help) {
    console.log('Usage: node scripts/migrate-shop-options-by-id.js [--dry-run | --apply --project banger-picks]')
    return
  }
  assertMigrateAllowed(args)
  const admin = require('../functions/node_modules/firebase-admin')
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: args.project || process.env.GCLOUD_PROJECT || 'demo-banger-picks' })
  }
  await migrateShopOptionsById({ db: admin.firestore(), apply: args.apply })
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = { migrateShopOptionsById, optionsByIdFrom }
