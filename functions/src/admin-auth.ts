import * as admin from 'firebase-admin'

/**
 * Whether the authenticated user is an admin (matches client useIsAdmin checks).
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  const db = admin.firestore()

  const userDoc = await db.collection('users').doc(uid).get()
  if (userDoc.exists && userDoc.data()?.isAdmin === true) {
    return true
  }

  const settingsDoc = await db.collection('settings').doc('app').get()
  if (!settingsDoc.exists) {
    return false
  }

  const adminUids: unknown = settingsDoc.data()?.adminUids
  if (!Array.isArray(adminUids)) {
    return false
  }

  return adminUids.some((id) => String(id).trim() === uid.trim())
}
