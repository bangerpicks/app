import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { isUserAdmin } from './admin-auth'
import { slimApiFootballFixture } from './slim-fixture'

type BackfillTask = 'slimFixtures' | 'displayNames' | 'crowdCounters' | 'standingsMeta' | 'all'

export type BackfillResult = {
  task: BackfillTask
  updated: number
  skipped: number
}

function slimFixture(payload: unknown): ReturnType<typeof slimApiFootballFixture> | null {
  if (!payload || typeof payload !== 'object') return null
  return slimApiFootballFixture(payload as never)
}

async function runSlimFixtures(db: admin.firestore.Firestore, dryRun: boolean): Promise<BackfillResult> {
  let updated = 0
  let skipped = 0
  const gameweeks = await db.collection('gameweeks').get()
  for (const gw of gameweeks.docs) {
    const fixtures = await gw.ref.collection('fixtures').get()
    let batch = db.batch()
    let n = 0
    for (const f of fixtures.docs) {
      const full = f.data().fixture
      const slimmed = slimFixture(full)
      if (!slimmed) {
        skipped++
        continue
      }
      const before = JSON.stringify(full).length
      const after = JSON.stringify(slimmed).length
      if (before <= after + 50) {
        skipped++
        continue
      }
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
  }
  return { task: 'slimFixtures', updated, skipped }
}

async function runDisplayNames(db: admin.firestore.Firestore, dryRun: boolean): Promise<BackfillResult> {
  let updated = 0
  let skipped = 0
  const users = await db.collection('users').get()
  let batch = db.batch()
  let n = 0
  for (const userDoc of users.docs) {
    const name = (userDoc.data().displayName as string | undefined)?.trim()
    if (!name) {
      skipped++
      continue
    }
    const key = name.toLowerCase()
    const ref = db.collection('displayNames').doc(key)
    const existing = await ref.get()
    if (existing.exists && existing.data()?.uid !== userDoc.id) {
      skipped++
      continue
    }
    if (!dryRun) batch.set(ref, { uid: userDoc.id, backfilledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    updated++
    n++
    if (!dryRun && n >= 400) {
      await batch.commit()
      batch = db.batch()
      n = 0
    }
  }
  if (!dryRun && n > 0) await batch.commit()
  return { task: 'displayNames', updated, skipped }
}

async function runCrowdCounters(db: admin.firestore.Firestore, dryRun: boolean): Promise<BackfillResult> {
  let updated = 0
  let skipped = 0
  const predictions = await db.collection('predictions').get()
  for (const pred of predictions.docs) {
    const entries = await pred.ref.collection('entries').get()
    const counts = { H: 0, D: 0, A: 0, total: 0 }
    for (const e of entries.docs) {
      const pick = e.data().pick as string | undefined
      if (pick === 'H' || pick === 'D' || pick === 'A') {
        counts[pick]++
        counts.total++
      }
    }
    if (counts.total === 0) {
      skipped++
      continue
    }
    if (!dryRun) {
      await pred.ref.set({ crowdPickCounts: counts }, { merge: true })
    }
    updated++
  }
  return { task: 'crowdCounters', updated, skipped }
}

async function runStandingsMeta(db: admin.firestore.Firestore, dryRun: boolean): Promise<BackfillResult> {
  let updated = 0
  let skipped = 0
  const gameweeks = await db.collection('gameweeks').get()
  for (const gw of gameweeks.docs) {
    const data = gw.data()
    const standings = data.standings
    if (!standings || typeof standings !== 'object') {
      skipped++
      continue
    }
    const metaRef = gw.ref.collection('meta').doc('standings')
    const meta = await metaRef.get()
    if (meta.exists) {
      skipped++
      continue
    }
    if (!dryRun) {
      await metaRef.set({
        standings,
        standingsFetchedAt: data.standingsFetchedAt ?? null,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      await gw.ref.update({
        standings: admin.firestore.FieldValue.delete(),
        standingsFetchedAt: admin.firestore.FieldValue.delete(),
      })
    }
    updated++
  }
  return { task: 'standingsMeta', updated, skipped }
}

async function runTasks(
  tasks: BackfillTask[],
  dryRun: boolean
): Promise<BackfillResult[]> {
  const db = admin.firestore()
  const out: BackfillResult[] = []
  const want = (t: BackfillTask) => tasks.includes('all') || tasks.includes(t)
  if (want('slimFixtures')) out.push(await runSlimFixtures(db, dryRun))
  if (want('displayNames')) out.push(await runDisplayNames(db, dryRun))
  if (want('crowdCounters')) out.push(await runCrowdCounters(db, dryRun))
  if (want('standingsMeta')) out.push(await runStandingsMeta(db, dryRun))
  return out
}

export const adminRunBackfills = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required')
  }
  if (!(await isUserAdmin(context.auth.uid))) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only')
  }

  const tasks = (Array.isArray(data?.tasks) ? data.tasks : ['all']) as BackfillTask[]
  const dryRun = data?.dryRun === true
  const results = await runTasks(tasks, dryRun)
  return { dryRun, results }
})