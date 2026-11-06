/**
 * Backfill users.pointsSpent from existing non-cancelled redemptions.
 *
 * Do not run this from deploy. Run it once, before deploying the rules that
 * charge pointsSpent, using Application Default Credentials or
 * GOOGLE_APPLICATION_CREDENTIALS:
 *
 *   node scripts/migrate-points-spent.js
 *
 * Re-running overwrites pointsSpent with the recomputed sum (it does not
 * increment). Missing pointsSpent is treated as 0 by the rules, so users with
 * no redemptions are left unchanged. Cancelled redemptions are excluded.
 * Cancelling a redemption later does not refund pointsSpent.
 */

const admin = require('../functions/node_modules/firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

async function main() {
  const redemptions = await db.collection('redemptions').get()
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

  let batch = db.batch()
  let writes = 0
  let committed = 0

  for (const [uid, pointsSpent] of spentByUser) {
    batch.set(db.collection('users').doc(uid), { pointsSpent }, { merge: true })
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

  console.log(
    `Set pointsSpent on ${committed} user(s) from ${redemptions.size} redemption(s).`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
