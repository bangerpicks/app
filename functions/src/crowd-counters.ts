import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

type PickSide = 'H' | 'D' | 'A'

function tallyEntries(
  snaps: FirebaseFirestore.QueryDocumentSnapshot[]
): { H: number; D: number; A: number; total: number } {
  const counts = { H: 0, D: 0, A: 0, total: 0 }
  for (const snap of snaps) {
    const pick = snap.data().pick as PickSide | undefined
    if (pick === 'H' || pick === 'D' || pick === 'A') {
      counts[pick]++
      counts.total++
    }
  }
  return counts
}

/** Denormalized H/D/A crowd counts on predictions/{fixtureId} for client reads. */
export const syncCrowdPickCounters = functions.firestore
  .document('predictions/{fixtureId}/entries/{uid}')
  .onWrite(async (_change, context) => {
    const fixtureId = context.params.fixtureId as string
    const db = admin.firestore()
    const entriesSnap = await db.collection('predictions').doc(fixtureId).collection('entries').get()
    const counts = tallyEntries(entriesSnap.docs)
    await db.collection('predictions').doc(fixtureId).set({ crowdPickCounts: counts }, { merge: true })
  })