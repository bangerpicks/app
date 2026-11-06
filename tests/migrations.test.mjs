/**
 * Migration script tests. Must run under the Firestore emulator
 * (npm run test:rules sets FIRESTORE_EMULATOR_HOST).
 */

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, before, describe, it } from 'node:test'
import { assertMigrateAllowed, parseMigrateArgs } from '../scripts/migrate-guard.js'
import { migratePointsSpent } from '../scripts/migrate-points-spent.js'
import { migrateShopOptionsById } from '../scripts/migrate-shop-options-by-id.js'
import { migratePlayerCounts } from '../scripts/migrate-player-counts.js'

const require = createRequire(import.meta.url)
const admin = require('../functions/node_modules/firebase-admin')

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('migrations tests require FIRESTORE_EMULATOR_HOST')
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'demo-banger-picks' })
}

const db = admin.firestore()
const silent = () => {}

async function deleteCollection(name) {
  const snap = await db.collection(name).get()
  const batch = db.batch()
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref))
  if (!snap.empty) await batch.commit()
}

async function wipe() {
  const predictions = await db.collection('predictions').get()
  for (const docSnap of predictions.docs) {
    const entries = await docSnap.ref.collection('entries').get()
    const batch = db.batch()
    entries.docs.forEach((entry) => batch.delete(entry.ref))
    batch.delete(docSnap.ref)
    await batch.commit()
  }
  await deleteCollection('users')
  await deleteCollection('redemptions')
  await deleteCollection('shopItems')
  await deleteCollection('gameweeks')
}

describe('migration guards', () => {
  it('refuses production without --project banger-picks and requires --project on --apply', () => {
    const previous = process.env.FIRESTORE_EMULATOR_HOST
    delete process.env.FIRESTORE_EMULATOR_HOST
    try {
      assert.throws(() => assertMigrateAllowed({ apply: false, project: null }))
      assert.throws(() => assertMigrateAllowed({ apply: true, project: 'other-project' }))
      assert.throws(() => assertMigrateAllowed({ apply: true, project: null }))
      assert.doesNotThrow(() => assertMigrateAllowed({ apply: false, project: 'banger-picks' }))
      assert.doesNotThrow(() => assertMigrateAllowed({ apply: true, project: 'banger-picks' }))
    } finally {
      process.env.FIRESTORE_EMULATOR_HOST = previous
    }
  })

  it('defaults to dry-run unless --apply is passed', () => {
    assert.equal(parseMigrateArgs([]).apply, false)
    assert.equal(parseMigrateArgs(['--project', 'banger-picks']).apply, false)
    assert.equal(parseMigrateArgs(['--apply', '--project', 'banger-picks']).apply, true)
    assert.equal(parseMigrateArgs(['--apply', '--project', 'banger-picks']).project, 'banger-picks')
    assert.throws(() => parseMigrateArgs(['--apply', '--dry-run', '--project', 'banger-picks']))
  })
})

describe('pointsSpent migration', () => {
  before(wipe)
  after(wipe)

  it('is a no-op on dry-run, never lowers, skips orphans, and is idempotent', async () => {
    await db.collection('users').doc('mig-user').set({ displayName: 'A', correctPredictions: 40 })
    await db.collection('users').doc('mig-zero').set({ displayName: 'Z' })
    await db.collection('users').doc('mig-high').set({ displayName: 'H', pointsSpent: 100 })
    await db.collection('redemptions').doc('r1').set({ userId: 'mig-user', pointsCost: 15, status: 'pending' })
    await db.collection('redemptions').doc('r2').set({ userId: 'mig-user', pointsCost: 10, status: 'cancelled' })
    await db.collection('redemptions').doc('r3').set({ userId: 'ghost', pointsCost: 20, status: 'pending' })
    await db.collection('redemptions').doc('r4').set({ userId: 'mig-high', pointsCost: 5, status: 'fulfilled' })

    const dry = await migratePointsSpent({ db, apply: false, log: silent })
    assert.equal((await db.collection('users').doc('mig-user').get()).data().pointsSpent, undefined)
    assert.ok(dry.changes.some((change) => change.id === 'mig-user' && change.pointsSpent === 15))
    assert.equal((await db.collection('users').doc('ghost').get()).exists, false)
    assert.deepEqual(dry.orphans, ['ghost'])

    await migratePointsSpent({ db, apply: true, log: silent })
    assert.equal((await db.collection('users').doc('mig-user').get()).data().pointsSpent, 15)
    assert.equal((await db.collection('users').doc('mig-zero').get()).data().pointsSpent, 0)
    assert.equal((await db.collection('users').doc('mig-high').get()).data().pointsSpent, 100)
    assert.equal((await db.collection('users').doc('ghost').get()).exists, false)

    await db.collection('users').doc('mig-user').update({ pointsSpent: 30 })
    await db.collection('redemptions').doc('r5').set({ userId: 'mig-user', pointsCost: 15, status: 'pending' })
    await migratePointsSpent({ db, apply: true, log: silent })
    assert.equal((await db.collection('users').doc('mig-user').get()).data().pointsSpent, 30)

    await db.collection('users').doc('mig-user').update({ pointsSpent: 10 })
    const raised = await migratePointsSpent({ db, apply: true, log: silent })
    assert.equal((await db.collection('users').doc('mig-user').get()).data().pointsSpent, 30)
    assert.ok(raised.changes.some((change) => change.id === 'mig-user' && change.pointsSpent === 30))

    const again = await migratePointsSpent({ db, apply: true, log: silent })
    assert.equal(again.changes.length, 0)
  })
})

describe('optionsById migration', () => {
  before(wipe)
  after(wipe)

  it('rewrites when values differ even if the key count matches, then no-ops', async () => {
    await db.collection('shopItems').doc('fav').set({
      name: 'Favorite',
      customization: {
        type: 'favoritePlayer',
        playerOptions: [
          { playerId: 1, name: 'A', photo: 'a.png', pointsCost: 4 },
          { playerId: 2, name: 'B', photo: 'b.png', pointsCost: 9 },
        ],
        optionsById: {
          '1': { playerId: 1, name: 'A', photo: 'a.png', pointsCost: 4 },
          '2': { playerId: 2, name: 'B', photo: 'b.png', pointsCost: 1 },
        },
      },
    })

    const dry = await migrateShopOptionsById({ db, apply: false, log: silent })
    assert.equal(dry.changes.length, 1)
    assert.equal((await db.collection('shopItems').doc('fav').get()).data().customization.optionsById['2'].pointsCost, 1)

    await migrateShopOptionsById({ db, apply: true, log: silent })
    assert.equal((await db.collection('shopItems').doc('fav').get()).data().customization.optionsById['2'].pointsCost, 9)

    const again = await migrateShopOptionsById({ db, apply: true, log: silent })
    assert.equal(again.changes.length, 0)
  })
})

describe('playerCount migration', () => {
  before(wipe)
  after(wipe)

  it('sets missing counts, never lowers a higher live count, and is idempotent', async () => {
    await db.collection('predictions').doc('10').set({ exists: true, playerCount: 5 })
    await db.collection('predictions').doc('10').collection('entries').doc('a').set({ pick: 'H' })
    await db.collection('predictions').doc('10').collection('entries').doc('b').set({ pick: 'A' })
    await db.collection('predictions').doc('11').set({ exists: true })
    await db.collection('predictions').doc('11').collection('entries').doc('c').set({ pick: 'H' })
    await db.collection('gameweeks').doc('gw').set({
      fixtureIds: [10, 11],
      status: 'active',
      playerCount: 9,
    })
    await db.collection('gameweeks').doc('empty').set({ fixtureIds: [], status: 'active' })

    const dry = await migratePlayerCounts({ db, apply: false, log: silent })
    assert.equal((await db.collection('predictions').doc('11').get()).data().playerCount, undefined)
    assert.ok(dry.changes.some((change) => change.path === 'predictions/11' && change.playerCount === 1))

    await migratePlayerCounts({ db, apply: true, log: silent })
    assert.equal((await db.collection('predictions').doc('10').get()).data().playerCount, 5)
    assert.equal((await db.collection('predictions').doc('11').get()).data().playerCount, 1)
    assert.equal((await db.collection('gameweeks').doc('gw').get()).data().playerCount, 9)
    assert.equal((await db.collection('gameweeks').doc('empty').get()).data().playerCount, 0)

    const again = await migratePlayerCounts({ db, apply: true, log: silent })
    assert.equal(again.changes.length, 0)
  })
})
