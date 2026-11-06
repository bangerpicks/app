/**
 * Add customization.optionsById on favorite-player shop items that only have
 * playerOptions. Rules look up a price by player id and will not scan the array.
 *
 * Do not run this from deploy. Run once before those redemptions must succeed:
 *
 *   node scripts/migrate-shop-options-by-id.js
 *
 * New and updated items already write optionsById from src/lib/shop.ts.
 */

const admin = require('../functions/node_modules/firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

function optionsByIdFrom(playerOptions) {
  const optionsById = {}
  for (const option of playerOptions) {
    if (!option || option.playerId == null) continue
    optionsById[String(option.playerId)] = option
  }
  return optionsById
}

async function main() {
  const items = await db.collection('shopItems').get()
  let batch = db.batch()
  let writes = 0
  let committed = 0

  for (const snapshot of items.docs) {
    const data = snapshot.data() || {}
    const customization = data.customization
    if (!customization || customization.type !== 'favoritePlayer') continue
    if (!Array.isArray(customization.playerOptions) || customization.playerOptions.length === 0) {
      continue
    }
    const optionsById = optionsByIdFrom(customization.playerOptions)
    const existing = customization.optionsById
    const sameSize =
      existing &&
      typeof existing === 'object' &&
      Object.keys(existing).length === Object.keys(optionsById).length
    if (sameSize) continue

    batch.update(snapshot.ref, { 'customization.optionsById': optionsById })
    writes += 1
    if (writes === 400) {
      await batch.commit()
      committed += writes
      batch = db.batch()
      writes = 0
    }
  }

  if (writes > 0) {
    await batch.commit()
    committed += writes
  }

  console.log(`Wrote optionsById on ${committed} shop item(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
