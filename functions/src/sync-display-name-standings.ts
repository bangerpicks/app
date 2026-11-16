import * as admin from 'firebase-admin'

interface StandingsEntryRow {
  uid: string
  displayName?: string
  [key: string]: unknown
}

function patchEntriesDisplayName(
  entries: unknown,
  uid: string,
  newDisplayName: string
): { next: StandingsEntryRow[]; changed: boolean } {
  if (!Array.isArray(entries)) {
    return { next: [], changed: false }
  }
  let changed = false
  const next = entries.map((raw) => {
    const row = raw as StandingsEntryRow
    if (row?.uid === uid && row.displayName !== newDisplayName) {
      changed = true
      return { ...row, displayName: newDisplayName }
    }
    return row as StandingsEntryRow
  })
  return { next, changed }
}

/**
 * Idempotent: updates denormalized displayName copies for one user in weekly and season standings.
 */
export async function syncDisplayNameInStandings(
  db: admin.firestore.Firestore,
  uid: string,
  newDisplayName: string,
  previousDisplayName?: string
): Promise<void> {
  const trimmed = newDisplayName.trim()
  if (!trimmed) return
  if (previousDisplayName === trimmed) return

  const collections = ['weeklyStandings', 'seasonStandings'] as const
  let batch = db.batch()
  let opCount = 0

  const commitIfNeeded = async () => {
    if (opCount === 0) return
    await batch.commit()
    batch = db.batch()
    opCount = 0
  }

  for (const collectionName of collections) {
    const snap = await db.collection(collectionName).get()
    for (const docSnap of snap.docs) {
      const data = docSnap.data()
      const { next, changed } = patchEntriesDisplayName(data.entries, uid, trimmed)
      if (!changed) continue

      batch.set(
        docSnap.ref,
        {
          entries: next,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      opCount++
      if (opCount >= 400) {
        await commitIfNeeded()
      }
    }
  }

  await commitIfNeeded()
}