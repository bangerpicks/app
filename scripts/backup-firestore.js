/**
 * Read-only JSON dump of the Firestore collections the rules release touches.
 *
 *   node scripts/backup-firestore.js --project banger-picks --out backups/firestore.json
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/backup-firestore.js --project demo-banger-picks --out backups/emulator.json
 *
 * Does not write to Firestore. Refuses to run unless FIRESTORE_EMULATOR_HOST
 * is set or --project banger-picks is passed. Not run by deploy.
 */

const fs = require('fs')
const path = require('path')
const { parseMigrateArgs, assertMigrateAllowed } = require('./migrate-guard')

function serialize(value) {
  if (value == null) return value
  if (typeof value.toDate === 'function') {
    const date = value.toDate()
    return { __type: 'timestamp', iso: date.toISOString() }
  }
  if (Array.isArray(value)) return value.map(serialize)
  if (typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value)) out[key] = serialize(value[key])
    return out
  }
  return value
}

async function dumpCollection(db, name) {
  const snap = await db.collection(name).get()
  const docs = {}
  snap.forEach((docSnap) => {
    docs[docSnap.id] = serialize(docSnap.data())
  })
  return docs
}

async function dumpWithSubcollection(db, name, subName) {
  const snap = await db.collection(name).get()
  const docs = {}
  for (const docSnap of snap.docs) {
    const children = {}
    const sub = await docSnap.ref.collection(subName).get()
    sub.forEach((child) => {
      children[child.id] = serialize(child.data())
    })
    docs[docSnap.id] = { data: serialize(docSnap.data()), [subName]: children }
  }
  return docs
}

async function backupFirestore({ db, outPath, projectId, log = console.log }) {
  const backup = {
    exportedAt: new Date().toISOString(),
    projectId: projectId || null,
    readOnly: true,
    users: await dumpCollection(db, 'users'),
    redemptions: await dumpCollection(db, 'redemptions'),
    shopItems: await dumpCollection(db, 'shopItems'),
    settings: await dumpCollection(db, 'settings'),
    predictions: await dumpWithSubcollection(db, 'predictions', 'entries'),
    gameweeks: await dumpWithSubcollection(db, 'gameweeks', 'fixtures'),
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(backup, null, 2)}\n`)
  const counts = {
    users: Object.keys(backup.users).length,
    redemptions: Object.keys(backup.redemptions).length,
    shopItems: Object.keys(backup.shopItems).length,
    settings: Object.keys(backup.settings).length,
    predictions: Object.keys(backup.predictions).length,
    gameweeks: Object.keys(backup.gameweeks).length,
  }
  log(`WROTE ${outPath} ${JSON.stringify(counts)}`)
  return { outPath, counts, backup }
}

async function main() {
  const args = parseMigrateArgs(process.argv.slice(2))
  if (args.help) {
    console.log('Usage: node scripts/backup-firestore.js --project banger-picks --out backups/firestore.json')
    return
  }
  assertMigrateAllowed({ apply: false, project: args.project })
  if (!args.out) {
    throw new Error('--out <file> is required')
  }
  const admin = require('../functions/node_modules/firebase-admin')
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: args.project || process.env.GCLOUD_PROJECT || 'demo-banger-picks' })
  }
  await backupFirestore({
    db: admin.firestore(),
    outPath: args.out,
    projectId: args.project,
  })
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = { backupFirestore, serialize }
