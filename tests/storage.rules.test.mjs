/**
 * Storage security rules tests. Cross-service firestore.get/exists runs
 * against the Firestore emulator in the same emulators:exec session.
 */

import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, it } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'
import { getBytes, ref, uploadBytes } from 'firebase/storage'

const USER = 'user1'
const ADMIN = 'admin1'
const LISTED = 'listedadmin'

let testEnv

async function assertDenied(operation) {
  const error = await assertFails(operation)
  const code = String(error.code || '')
  const message = String(error.message || '')
  if (
    !code.includes('permission-denied') &&
    !code.includes('storage/unauthorized') &&
    !message.includes('PERMISSION_DENIED') &&
    !message.toLowerCase().includes('permission') &&
    !message.toLowerCase().includes('unauthorized')
  ) {
    throw new Error(`Expected permission-denied but got ${code}: ${message}`)
  }
  return error
}

function storageAs(uid) {
  return uid
    ? testEnv.authenticatedContext(uid).storage()
    : testEnv.unauthenticatedContext().storage()
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-banger-picks',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
    storage: {
      rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8'),
    },
  })
}, { timeout: 120_000 })

after(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.clearStorage()
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'users', ADMIN), { isAdmin: true, displayName: 'Admin' })
    await setDoc(doc(db, 'users', USER), { isAdmin: false, displayName: 'Player' })
    await setDoc(doc(db, 'settings', 'app'), { adminUids: [LISTED], shopEnabled: true })
  })
})

describe('storage shop-items', () => {
  const bytes = new Uint8Array([1, 2, 3, 4])

  it('lets an isAdmin user upload and any signed-in user read', async () => {
    const path = 'shop-items/item-badge/photo.png'
    await assertSucceeds(uploadBytes(ref(storageAs(ADMIN), path), bytes))
    await assertSucceeds(getBytes(ref(storageAs(USER), path)))
  })

  it('lets an adminUids user upload', async () => {
    await assertSucceeds(uploadBytes(ref(storageAs(LISTED), 'shop-items/item-hat/photo.png'), bytes))
  })

  it('denies non-admin and signed-out writes, signed-out reads, and other paths', async () => {
    await assertDenied(uploadBytes(ref(storageAs(USER), 'shop-items/item-badge/photo.png'), bytes))
    await assertDenied(uploadBytes(ref(storageAs(null), 'shop-items/item-badge/photo.png'), bytes))
    await assertSucceeds(uploadBytes(ref(storageAs(ADMIN), 'shop-items/item-badge/photo.png'), bytes))
    await assertDenied(getBytes(ref(storageAs(null), 'shop-items/item-badge/photo.png')))
    await assertDenied(uploadBytes(ref(storageAs(ADMIN), 'users/admin1/profile.png'), bytes))
    await assertDenied(getBytes(ref(storageAs(ADMIN), 'users/admin1/profile.png')))
  })
})
