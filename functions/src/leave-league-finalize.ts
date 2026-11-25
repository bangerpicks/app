import * as admin from 'firebase-admin'

/**
 * When a gameweek completes, finish deferred league leaves tied to that round.
 */
export async function finalizePendingLeavesForGameweek(
  db: admin.firestore.Firestore,
  gameweekId: string
): Promise<number> {
  const snap = await db
    .collectionGroup('competitions')
    .where('pendingLeaveGameweekId', '==', gameweekId)
    .limit(200)
    .get()

  if (snap.empty) return 0

  let finalized = 0
  for (const doc of snap.docs) {
    const uid = doc.ref.parent.parent?.id
    if (!uid) continue
    const competitionId = doc.id

    const homeRef = db.collection('users').doc(uid).collection('homeMembership').doc('summary')
    const batch = db.batch()
    batch.delete(doc.ref)
    batch.set(
      homeRef,
      {
        competitionIds: admin.firestore.FieldValue.arrayRemove(competitionId),
        dismissedCompetitionIds: admin.firestore.FieldValue.arrayUnion(competitionId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    batch.set(
      db.collection('competitions').doc(competitionId),
      {
        memberCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    await batch.commit()
    finalized++
  }
  return finalized
}