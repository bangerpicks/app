import * as admin from 'firebase-admin'
import { resolveDefaultLeagueIds } from './default-league-ids'

/**
 * Idempotent: enroll new users in default public leagues (Weekend / Midweek / Liguilla).
 */
export async function provisionDefaultLeaguesForUser(
  db: admin.firestore.Firestore,
  uid: string
): Promise<{ joined: string[]; skipped: string[] }> {
  const leagueIds = await resolveDefaultLeagueIds(db)
  const joined: string[] = []
  const skipped: string[] = []

  const userRef = db.collection('users').doc(uid)
  const homeMemRef = userRef.collection('homeMembership').doc('summary')

  for (const competitionId of leagueIds) {
    const compSnap = await db.collection('competitions').doc(competitionId).get()
    if (!compSnap.exists) {
      skipped.push(competitionId)
      continue
    }
    const comp = compSnap.data() || {}
    if (comp.status !== 'active') {
      skipped.push(competitionId)
      continue
    }

    const memRef = userRef.collection('competitions').doc(competitionId)
    const memSnap = await memRef.get()
    if (memSnap.exists) {
      skipped.push(competitionId)
      continue
    }

    await db.runTransaction(async (tx) => {
      const memInTx = await tx.get(memRef)
      if (memInTx.exists) return

      tx.set(memRef, {
        competitionId,
        role: 'member',
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        joinedVia: 'default',
      })
      tx.set(
        homeMemRef,
        {
          competitionIds: admin.firestore.FieldValue.arrayUnion(competitionId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      tx.set(
        db.collection('competitions').doc(competitionId),
        {
          memberCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    })

    joined.push(competitionId)
  }

  await userRef.set(
    { defaultLeaguesProvisionedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  )

  return { joined, skipped }
}