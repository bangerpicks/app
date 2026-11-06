/**
 * Firestore security rules tests. Run with `npm run test:rules`
 * (Firestore emulator via firebase emulators:exec).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, it } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const USER = 'user-1'
const OTHER = 'user-2'
const ADMIN = 'admin-1'
const LISTED = 'listed-admin'
const FIXTURE_ID = 12345

let testEnv

async function assertDenied(operation) {
  const error = await assertFails(operation)
  const code = String(error.code || '')
  const message = String(error.message || '')
  if (
    !code.includes('permission-denied') &&
    !message.includes('PERMISSION_DENIED') &&
    !message.toLowerCase().includes('permission')
  ) {
    throw new Error(`Expected permission-denied but got ${code}: ${message}`)
  }
  return error
}

function dbAs(uid) {
  return testEnv.authenticatedContext(uid).firestore()
}

function dbAnon() {
  return testEnv.unauthenticatedContext().firestore()
}

async function seed(write) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await write(context.firestore())
  })
}

function newUserPayload(uid, overrides = {}) {
  return {
    uid,
    displayName: 'Player One',
    photoURL: null,
    points: 0,
    referralCode: 'PLAYER1',
    referralPoints: 0,
    referredBy: null,
    hasSeenOnboardingIntro: false,
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
    ...overrides,
  }
}

function predictionEntry(uid, fixtureId, pick = 'H', overrides = {}) {
  return {
    uid,
    fixtureId,
    pick,
    createdAt: serverTimestamp(),
    awarded: false,
    points: 0,
    correct: null,
    homeTeam: { id: 33, name: 'Manchester United', logo: 'h.png' },
    awayTeam: { id: 50, name: 'Manchester City', logo: 'a.png' },
    league: { id: 39, name: 'Premier League', country: '', logo: 'l.png' },
    fixtureDate: Timestamp.fromDate(new Date('2026-11-08T15:00:00Z')),
    status: 'NS',
    result: null,
    ...overrides,
  }
}

function redemptionDoc(uid, item, overrides = {}) {
  const now = Timestamp.now()
  return {
    redemptionId: 'redemption-1',
    userId: uid,
    itemId: item.itemId,
    itemName: item.name,
    pointsCost: item.pointsCost,
    redeemedAt: now,
    status: 'pending',
    updatedAt: now,
    ...overrides,
  }
}

async function seedAdmins() {
  await seed(async (db) => {
    await setDoc(doc(db, 'users', ADMIN), {
      uid: ADMIN,
      displayName: 'Admin',
      isAdmin: true,
      points: 10,
      referralPoints: 0,
    })
    await setDoc(doc(db, 'settings', 'app'), {
      adminUids: [LISTED],
      appName: 'Banger Picks',
      shopEnabled: true,
      updatedAt: Timestamp.now(),
    })
  })
}

async function seedExistingUser(extra = {}) {
  await seed(async (db) => {
    await setDoc(doc(db, 'users', USER), {
      uid: USER,
      displayName: 'Player One',
      photoURL: null,
      points: 12,
      totalPredictions: 4,
      correctPredictions: 3,
      accuracy: 75,
      referralCode: 'PLAYER1',
      referralPoints: 5,
      referredBy: null,
      hasSeenOnboardingIntro: false,
      weekWins1st: 1,
      weekWins2nd: 0,
      weekWins3rd: 0,
      lastWeekPlace: 1,
      lastCompletedGameweekId: 'gw-old',
      isAdmin: false,
      language: 'en',
      createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
      lastUpdated: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
      ...extra,
    })
  })
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-banger-picks',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  })
}, { timeout: 120_000 })

after(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

describe('default deny', () => {
  it('denies unauthenticated and authenticated access to unknown collections', async () => {
    await assertDenied(getDoc(doc(dbAnon(), 'secrets', 'x')))
    await assertDenied(setDoc(doc(dbAs(USER), 'secrets', 'x'), { a: 1 }))
    await assertDenied(setDoc(doc(dbAnon(), 'secrets', 'x'), { a: 1 }))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER, 'secrets', 'x'), { a: 1 }))
  })
})

describe('users', () => {
  it('allows a signed-out and signed-in read of profiles and the rankings query', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', USER), {
        uid: USER,
        displayName: 'Player One',
        points: 12,
        referralCode: 'PLAYER1',
      })
      await setDoc(doc(db, 'users', OTHER), {
        uid: OTHER,
        displayName: 'Player Two',
        points: 4,
        referralCode: 'PLAYER2',
      })
    })

    await assertSucceeds(getDoc(doc(dbAnon(), 'users', USER)))
    await assertSucceeds(getDocs(query(collection(dbAnon(), 'users'), orderBy('points', 'desc'), limit(100))))
    await assertSucceeds(
      getDocs(query(collection(dbAs(USER), 'users'), where('referralCode', '==', 'PLAYER2')))
    )
    await assertSucceeds(getDocs(collection(dbAs(USER), 'users')))
  })

  it('allows the owner to create a zeroed profile', async () => {
    await assertSucceeds(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER)))
  })

  it('denies unauthenticated creates and creates for another uid', async () => {
    await assertDenied(setDoc(doc(dbAnon(), 'users', USER), newUserPayload(USER)))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', OTHER), newUserPayload(OTHER)))
  })

  it('denies creating a profile with stats, isAdmin, or protected fields', async () => {
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER, { points: 50 })))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER, { referralPoints: 5 })))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER, { isAdmin: true })))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER, { correctPredictions: 9 })))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER, { totalPredictions: 9 })))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER, { accuracy: 100 })))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER, { weekWins1st: 3 })))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER, { lastWeekPlace: 1 })))
    await assertDenied(
      setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER, { lastCompletedGameweekId: 'gw-1' }))
    )
  })

  it('allows owner profile, language, onboarding, referral code, and favorite player writes', async () => {
    await seedExistingUser()
    const userDb = dbAs(USER)

    await assertSucceeds(
      setDoc(
        doc(userDb, 'users', USER),
        {
          displayName: 'New Name',
          photoURL: 'https://example.com/p.png',
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      )
    )
    await assertSucceeds(
      setDoc(
        doc(userDb, 'users', USER),
        { language: 'es-MX', lastUpdated: serverTimestamp() },
        { merge: true }
      )
    )
    await assertSucceeds(
      setDoc(
        doc(userDb, 'users', USER),
        { hasSeenOnboardingIntro: true, lastUpdated: serverTimestamp() },
        { merge: true }
      )
    )
    await assertSucceeds(
      updateDoc(doc(userDb, 'users', USER), {
        favoritePlayer: { id: 10, name: 'Star', photo: 's.png' },
        lastUpdated: serverTimestamp(),
      })
    )
    await assertSucceeds(
      updateDoc(doc(userDb, 'users', USER), {
        favoritePlayer: null,
        lastUpdated: serverTimestamp(),
      })
    )

    await seed(async (db) => {
      await setDoc(
        doc(db, 'users', OTHER),
        {
          uid: OTHER,
          displayName: 'Other',
          points: 0,
          referralPoints: 0,
        },
        { merge: true }
      )
    })
    await assertSucceeds(
      setDoc(doc(dbAs(OTHER), 'users', OTHER), { referralCode: 'OTHER99' }, { merge: true })
    )
  })

  it('denies owner changes to protected stat fields and referral code replacement', async () => {
    await seedExistingUser()
    const ref = doc(dbAs(USER), 'users', USER)

    await assertDenied(updateDoc(ref, { points: 999, lastUpdated: serverTimestamp() }))
    await assertDenied(updateDoc(ref, { correctPredictions: 99 }))
    await assertDenied(updateDoc(ref, { totalPredictions: 99 }))
    await assertDenied(updateDoc(ref, { accuracy: 100 }))
    await assertDenied(updateDoc(ref, { isAdmin: true }))
    await assertDenied(updateDoc(ref, { weekWins1st: 9 }))
    await assertDenied(updateDoc(ref, { weekWins2nd: 9 }))
    await assertDenied(updateDoc(ref, { weekWins3rd: 9 }))
    await assertDenied(updateDoc(ref, { referralPoints: 500 }))
    await assertDenied(updateDoc(ref, { lastWeekPlace: 3 }))
    await assertDenied(updateDoc(ref, { lastCompletedGameweekId: 'gw-hack' }))
    await assertDenied(updateDoc(ref, { referredBy: 'someone' }))
    await assertDenied(updateDoc(ref, { referralCode: 'STOLEN' }))
    await assertDenied(updateDoc(ref, { language: 'fr', lastUpdated: serverTimestamp() }))
    await assertDenied(updateDoc(ref, { email: 'a@b.com' }))
    await assertDenied(updateDoc(doc(dbAs(OTHER), 'users', USER), { displayName: 'Hijack' }))
    await assertDenied(deleteDoc(ref))
  })

  it('allows an admin to update protected user fields', async () => {
    await seedAdmins()
    await seedExistingUser()
    await assertSucceeds(
      updateDoc(doc(dbAs(ADMIN), 'users', USER), {
        points: 40,
        correctPredictions: 8,
        totalPredictions: 10,
        accuracy: 80,
        isAdmin: true,
        weekWins1st: 2,
        referralPoints: 15,
        lastWeekPlace: 2,
        lastCompletedGameweekId: 'gw-new',
      })
    )
  })

  it('keeps isAdmin when the admin updates their own display name', async () => {
    await seedAdmins()
    await assertSucceeds(
      updateDoc(doc(dbAs(ADMIN), 'users', ADMIN), {
        displayName: 'Chief',
        lastUpdated: serverTimestamp(),
      })
    )
    const snap = await getDoc(doc(dbAnon(), 'users', ADMIN))
    assert.equal(snap.data().isAdmin, true)
    assert.equal(snap.data().displayName, 'Chief')
  })
})

describe('gameweek prediction cache', () => {
  it('allows only the owner to read and write the cache', async () => {
    const ref = (database) => doc(database, 'users', USER, 'gameweek_predictions', 'gw-1')
    await assertSucceeds(
      setDoc(ref(dbAs(USER)), {
        predictions: { [String(FIXTURE_ID)]: 'H', '99': 'D' },
        updatedAt: serverTimestamp(),
      })
    )
    await assertSucceeds(getDoc(ref(dbAs(USER))))
    await assertSucceeds(
      setDoc(ref(dbAs(USER)), {
        predictions: { [String(FIXTURE_ID)]: 'A' },
        updatedAt: serverTimestamp(),
      })
    )
    await assertDenied(getDoc(ref(dbAs(OTHER))))
    await assertDenied(getDoc(ref(dbAnon())))
    await assertDenied(
      setDoc(ref(dbAs(OTHER)), {
        predictions: { '1': 'H' },
        updatedAt: serverTimestamp(),
      })
    )
    await assertDenied(
      setDoc(ref(dbAnon()), {
        predictions: { '1': 'H' },
        updatedAt: serverTimestamp(),
      })
    )
    await assertDenied(
      setDoc(ref(dbAs(USER)), {
        predictions: { '1': 'H' },
        updatedAt: serverTimestamp(),
        points: 100,
      })
    )
  })
})

describe('predictions', () => {
  function entryRef(database, uid = USER) {
    return doc(database, 'predictions', String(FIXTURE_ID), 'entries', uid)
  }

  async function savePick(database, uid, pick = 'H', overrides = {}) {
    const batch = writeBatch(database)
    batch.set(doc(database, 'predictions', String(FIXTURE_ID)), { exists: true }, { merge: true })
    batch.set(entryRef(database, uid), predictionEntry(uid, FIXTURE_ID, pick, overrides), { merge: true })
    return batch.commit()
  }

  it('allows a signed-in user to save a pick and another user to reuse the parent', async () => {
    await assertSucceeds(savePick(dbAs(USER), USER, 'H'))
    await assertSucceeds(savePick(dbAs(OTHER), OTHER, 'D'))
    await assertSucceeds(
      setDoc(entryRef(dbAs(USER)), predictionEntry(USER, FIXTURE_ID, 'A'), { merge: true })
    )
    await assertSucceeds(getDocs(collection(dbAnon(), 'predictions', String(FIXTURE_ID), 'entries')))
    await assertSucceeds(getDoc(entryRef(dbAs(OTHER), USER)))
  })

  it('still allows a pick when the stored gameweek deadline is in the past', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'gameweeks', 'gw-closed'), {
        status: 'active',
        deadline: Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000)),
        forceOpenForTesting: false,
        fixtureIds: [FIXTURE_ID],
        startDate: Timestamp.now(),
      })
    })
    await assertSucceeds(savePick(dbAs(USER), USER, 'H'))
  })

  it('denies unauthenticated writes, cross-user writes, deletes, and parent tampering', async () => {
    await assertDenied(savePick(dbAnon(), USER, 'H'))
    await assertSucceeds(savePick(dbAs(USER), USER, 'H'))
    await assertDenied(setDoc(entryRef(dbAs(OTHER), USER), predictionEntry(USER, FIXTURE_ID, 'A')))
    await assertDenied(deleteDoc(entryRef(dbAs(USER))))
    await assertDenied(
      setDoc(doc(dbAs(USER), 'predictions', String(FIXTURE_ID)), { exists: true, awarded: true }, { merge: true })
    )
  })

  it('denies client scoring fields and rejects writes once awarded', async () => {
    await assertDenied(savePick(dbAs(USER), USER, 'H', { awarded: true }))
    await assertDenied(savePick(dbAs(USER), USER, 'H', { points: 5 }))
    await assertDenied(savePick(dbAs(USER), USER, 'H', { points: -1 }))
    await assertDenied(savePick(dbAs(USER), USER, 'X'))
    await assertDenied(savePick(dbAs(USER), USER, 'H', { correct: true }))

    await seed(async (db) => {
      await setDoc(doc(db, 'predictions', String(FIXTURE_ID)), { exists: true })
      await setDoc(entryRef(db), {
        uid: USER,
        fixtureId: FIXTURE_ID,
        pick: 'H',
        awarded: true,
        points: 1,
        correct: true,
      })
    })
    await assertDenied(
      setDoc(entryRef(dbAs(USER)), predictionEntry(USER, FIXTURE_ID, 'A'), { merge: true })
    )
    await assertDenied(
      updateDoc(entryRef(dbAs(USER)), { awarded: false, points: 0, correct: null, pick: 'A' })
    )
  })
})

describe('gameweeks', () => {
  it('allows signed-out dashboard reads and the active-gameweek query', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'gameweeks', 'gw-1'), {
        name: 'Gameweek 1',
        status: 'active',
        startDate: Timestamp.fromDate(new Date('2026-11-01T00:00:00Z')),
        deadline: Timestamp.fromDate(new Date('2026-11-08T14:00:00Z')),
        fixtureIds: [FIXTURE_ID],
      })
      await setDoc(doc(db, 'gameweeks', 'gw-1', 'fixtures', String(FIXTURE_ID)), {
        fixtureId: FIXTURE_ID,
        teams: { home: { id: 1, name: 'Home', logo: '' }, away: { id: 2, name: 'Away', logo: '' } },
      })
      await setDoc(doc(db, 'gameweeks', 'gw-draft'), {
        name: 'Draft',
        status: 'draft',
        startDate: Timestamp.fromDate(new Date('2026-10-01T00:00:00Z')),
      })
    })

    const anon = dbAnon()
    await assertSucceeds(
      getDocs(query(collection(anon, 'gameweeks'), where('status', '==', 'active'), orderBy('startDate', 'desc')))
    )
    await assertSucceeds(getDocs(query(collection(anon, 'gameweeks'), orderBy('startDate', 'desc'))))
    await assertSucceeds(getDocs(collection(anon, 'gameweeks', 'gw-1', 'fixtures')))
    await assertSucceeds(getDoc(doc(anon, 'gameweeks', 'gw-draft')))
  })

  it('allows admin flag and adminUids editors to write gameweeks and fixtures', async () => {
    await seedAdmins()
    const gameweek = {
      gameweekId: 'gw-new',
      name: 'Gameweek',
      status: 'draft',
      startDate: Timestamp.now(),
      endDate: Timestamp.now(),
      deadline: Timestamp.now(),
      fixtureIds: [FIXTURE_ID],
      createdBy: ADMIN,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      forceOpenForTesting: false,
    }

    await assertSucceeds(setDoc(doc(dbAs(ADMIN), 'gameweeks', 'gw-new'), gameweek))
    await assertSucceeds(
      updateDoc(doc(dbAs(ADMIN), 'gameweeks', 'gw-new'), {
        status: 'active',
        forceOpenForTesting: true,
        updatedAt: Timestamp.now(),
      })
    )

    const listed = dbAs(LISTED)
    const batch = writeBatch(listed)
    batch.set(doc(listed, 'gameweeks', 'gw-new', 'fixtures', String(FIXTURE_ID)), {
      fixtureId: FIXTURE_ID,
      addedBy: LISTED,
      addedAt: Timestamp.now(),
    })
    await assertSucceeds(batch.commit())
    await assertSucceeds(deleteDoc(doc(listed, 'gameweeks', 'gw-new', 'fixtures', String(FIXTURE_ID))))
    await assertSucceeds(deleteDoc(doc(dbAs(ADMIN), 'gameweeks', 'gw-new')))
  })

  it('denies non-admin and signed-out gameweek writes', async () => {
    await seedAdmins()
    await seed(async (db) => {
      await setDoc(doc(db, 'gameweeks', 'gw-1'), { name: 'GW', status: 'active', startDate: Timestamp.now() })
    })
    await assertDenied(setDoc(doc(dbAs(USER), 'gameweeks', 'gw-x'), { name: 'Hack', status: 'active' }))
    await assertDenied(updateDoc(doc(dbAs(USER), 'gameweeks', 'gw-1'), { status: 'completed' }))
    await assertDenied(deleteDoc(doc(dbAnon(), 'gameweeks', 'gw-1')))
    await assertDenied(
      setDoc(doc(dbAs(USER), 'gameweeks', 'gw-1', 'fixtures', '1'), { fixtureId: 1 })
    )
  })

  it('allows an isAdmin user to create settings when the doc is missing', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', ADMIN), { uid: ADMIN, isAdmin: true, displayName: 'Admin' })
    })
    await assertSucceeds(
      setDoc(
        doc(dbAs(ADMIN), 'settings', 'app'),
        { gameweekDeadlineOffsetMinutes: 5, updatedAt: Timestamp.now() },
        { merge: true }
      )
    )
  })
})

describe('shop items and settings', () => {
  const activeItem = {
    itemId: 'item-badge',
    name: 'Premium Badge',
    description: 'A badge',
    category: 'digital',
    pointsCost: 50,
    imageUrl: 'https://example.com/badge.png',
    featured: false,
    status: 'active',
    createdAt: Timestamp.fromDate(new Date('2026-11-01T00:00:00Z')),
    updatedAt: Timestamp.fromDate(new Date('2026-11-01T00:00:00Z')),
    createdBy: ADMIN,
  }

  it('allows public shop reads used by the shop page and admin sorts', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'shopItems', 'item-badge'), activeItem)
    })
    const anon = dbAnon()
    await assertSucceeds(
      getDocs(query(collection(anon, 'shopItems'), where('status', '==', 'active'), orderBy('createdAt', 'desc')))
    )
    await assertSucceeds(
      getDocs(query(collection(anon, 'shopItems'), where('status', '==', 'active'), orderBy('pointsCost', 'asc')))
    )
    await assertSucceeds(
      getDocs(query(collection(anon, 'shopItems'), where('status', '==', 'active'), orderBy('name', 'asc')))
    )
  })

  it('allows admin shop CRUD and denies non-admin catalog writes', async () => {
    await seedAdmins()
    await assertSucceeds(setDoc(doc(dbAs(ADMIN), 'shopItems', 'item-badge'), activeItem))
    await assertSucceeds(
      updateDoc(doc(dbAs(ADMIN), 'shopItems', 'item-badge'), {
        pointsCost: 40,
        status: 'inactive',
        updatedAt: Timestamp.now(),
      })
    )
    await assertDenied(setDoc(doc(dbAs(USER), 'shopItems', 'item-free'), { ...activeItem, pointsCost: 1 }))
    await assertDenied(updateDoc(doc(dbAs(USER), 'shopItems', 'item-badge'), { pointsCost: 1 }))
    await assertSucceeds(deleteDoc(doc(dbAs(LISTED), 'shopItems', 'item-badge')))
  })

  it('allows a signed-in user to decrement stock by exactly 1', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'shopItems', 'item-shirt'), {
        ...activeItem,
        itemId: 'item-shirt',
        name: 'Shirt',
        category: 'physical',
        stock: 5,
        pointsCost: 20,
      })
    })
    await assertSucceeds(
      updateDoc(doc(dbAs(USER), 'shopItems', 'item-shirt'), {
        stock: increment(-1),
        updatedAt: Timestamp.now(),
      })
    )
    const snap = await getDoc(doc(dbAnon(), 'shopItems', 'item-shirt'))
    assert.equal(snap.data().stock, 4)
  })

  it('denies other stock changes and unauthenticated stock writes', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'shopItems', 'item-shirt'), {
        itemId: 'item-shirt',
        name: 'Shirt',
        pointsCost: 20,
        status: 'active',
        stock: 1,
        createdAt: Timestamp.now(),
      })
    })
    await assertSucceeds(
      updateDoc(doc(dbAs(USER), 'shopItems', 'item-shirt'), {
        stock: increment(-1),
        updatedAt: Timestamp.now(),
      })
    )
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'shopItems', 'item-shirt'), {
        stock: increment(-1),
        updatedAt: Timestamp.now(),
      })
    )

    await seed(async (db) => {
      await setDoc(doc(db, 'shopItems', 'item-hat'), {
        itemId: 'item-hat',
        name: 'Hat',
        pointsCost: 10,
        status: 'active',
        stock: 4,
      })
    })
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'shopItems', 'item-hat'), {
        stock: increment(-2),
        updatedAt: Timestamp.now(),
      })
    )
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'shopItems', 'item-hat'), {
        stock: increment(1),
        updatedAt: Timestamp.now(),
      })
    )
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'shopItems', 'item-hat'), {
        stock: increment(-1),
        name: 'Free hat',
        updatedAt: Timestamp.now(),
      })
    )
    await assertDenied(
      updateDoc(doc(dbAnon(), 'shopItems', 'item-hat'), {
        stock: increment(-1),
        updatedAt: Timestamp.now(),
      })
    )
  })

  it('allows public settings reads and admin updates, and blocks non-admin creates', async () => {
    await seedAdmins()
    await assertSucceeds(getDoc(doc(dbAnon(), 'settings', 'app')))
    await assertSucceeds(
      setDoc(
        doc(dbAs(ADMIN), 'settings', 'app'),
        { gameweekDeadlineOffsetMinutes: 10, updatedAt: Timestamp.now() },
        { merge: true }
      )
    )
    await assertDenied(
      setDoc(doc(dbAs(USER), 'settings', 'app'), { adminUids: [USER] }, { merge: true })
    )
    await assertDenied(setDoc(doc(dbAnon(), 'settings', 'other'), { adminUids: [USER] }))
    await assertDenied(deleteDoc(doc(dbAs(USER), 'settings', 'app')))
  })

  it('denies a non-admin creating settings/app when it does not exist', async () => {
    await assertDenied(
      setDoc(doc(dbAs(USER), 'settings', 'app'), {
        adminUids: [USER],
        appName: 'Banger Picks',
      })
    )
  })
})

describe('redemptions', () => {
  const badge = {
    itemId: 'item-badge',
    name: 'Premium Badge',
    pointsCost: 50,
    status: 'active',
    category: 'digital',
    createdAt: Timestamp.now(),
  }
  const shirt = {
    itemId: 'item-shirt',
    name: 'Shirt',
    pointsCost: 20,
    status: 'active',
    category: 'physical',
    stock: 3,
    createdAt: Timestamp.now(),
  }
  const favorite = {
    itemId: 'item-fav',
    name: 'Favorite Player Photo',
    pointsCost: 4,
    status: 'active',
    category: 'digital',
    customization: {
      type: 'favoritePlayer',
      playerOptions: [
        { playerId: 1, name: 'Cheap', photo: 'c.png', pointsCost: 4 },
        { playerId: 2, name: 'Star', photo: 's.png', pointsCost: 20 },
      ],
    },
    createdAt: Timestamp.now(),
  }

  async function seedShop() {
    await seedAdmins()
    await seed(async (db) => {
      await setDoc(doc(db, 'shopItems', badge.itemId), badge)
      await setDoc(doc(db, 'shopItems', shirt.itemId), shirt)
      await setDoc(doc(db, 'shopItems', favorite.itemId), favorite)
      await setDoc(doc(db, 'users', USER), {
        uid: USER,
        displayName: 'Player One',
        points: 0,
        correctPredictions: 0,
        referralPoints: 0,
      })
    })
  }

  it('allows a self redemption at the shop item price, fulfill, and profile side effects', async () => {
    await seedShop()
    const redemptionId = 'redemption-badge'
    await assertSucceeds(
      setDoc(
        doc(dbAs(USER), 'redemptions', redemptionId),
        redemptionDoc(USER, badge, { redemptionId })
      )
    )
    await assertSucceeds(
      updateDoc(doc(dbAs(USER), 'users', USER), {
        displayName: 'Renamed',
        lastUpdated: serverTimestamp(),
      })
    )
    await assertSucceeds(
      updateDoc(doc(dbAs(USER), 'redemptions', redemptionId), {
        status: 'fulfilled',
        updatedAt: Timestamp.now(),
        fulfilledAt: Timestamp.now(),
      })
    )
    await assertSucceeds(
      getDocs(query(collection(dbAs(USER), 'redemptions'), where('userId', '==', USER)))
    )
  })

  it('allows a favorite-player redemption only at that player option price', async () => {
    await seedShop()
    await assertSucceeds(
      setDoc(
        doc(dbAs(USER), 'redemptions', 'redemption-star'),
        redemptionDoc(USER, favorite, {
          redemptionId: 'redemption-star',
          pointsCost: 20,
          redemptionData: {
            playerId: 2,
            playerName: 'Star',
            playerPhoto: 's.png',
            pointsCost: 20,
          },
        })
      )
    )
    await assertSucceeds(
      updateDoc(doc(dbAs(USER), 'users', USER), {
        favoritePlayer: { id: 2, name: 'Star', photo: 's.png' },
        lastUpdated: serverTimestamp(),
      })
    )
    await assertSucceeds(
      updateDoc(doc(dbAs(USER), 'redemptions', 'redemption-star'), {
        status: 'fulfilled',
        updatedAt: Timestamp.now(),
        fulfilledAt: Timestamp.now(),
      })
    )

    await assertDenied(
      setDoc(
        doc(dbAs(USER), 'redemptions', 'redemption-underpay'),
        redemptionDoc(USER, favorite, {
          redemptionId: 'redemption-underpay',
          pointsCost: 4,
          redemptionData: {
            playerId: 2,
            playerName: 'Star',
            playerPhoto: 's.png',
            pointsCost: 4,
          },
        })
      )
    )
  })

  it('allows a physical redemption plus the separate stock decrement', async () => {
    await seedShop()
    await assertSucceeds(
      setDoc(
        doc(dbAs(USER), 'redemptions', 'redemption-shirt'),
        redemptionDoc(USER, shirt, { redemptionId: 'redemption-shirt' })
      )
    )
    await assertSucceeds(
      updateDoc(doc(dbAs(USER), 'shopItems', shirt.itemId), {
        stock: increment(-1),
        updatedAt: Timestamp.now(),
      })
    )
  })

  it('denies forged prices, cross-user creates, and non-fulfill owner updates', async () => {
    await seedShop()
    await assertDenied(
      setDoc(
        doc(dbAs(USER), 'redemptions', 'redemption-cheap'),
        redemptionDoc(USER, badge, { redemptionId: 'redemption-cheap', pointsCost: 1 })
      )
    )
    await assertDenied(
      setDoc(
        doc(dbAs(USER), 'redemptions', 'redemption-other'),
        redemptionDoc(OTHER, badge, { redemptionId: 'redemption-other' })
      )
    )
    await assertDenied(
      setDoc(
        doc(dbAnon(), 'redemptions', 'redemption-anon'),
        redemptionDoc(USER, badge, { redemptionId: 'redemption-anon' })
      )
    )
    await assertDenied(
      setDoc(
        doc(dbAs(USER), 'redemptions', 'redemption-done'),
        redemptionDoc(USER, badge, { redemptionId: 'redemption-done', status: 'fulfilled' })
      )
    )
    await assertDenied(
      setDoc(
        doc(dbAs(USER), 'redemptions', 'redemption-missing'),
        redemptionDoc(USER, { itemId: 'missing-item', name: 'Nope', pointsCost: 1 }, {
          redemptionId: 'redemption-missing',
        })
      )
    )

    await assertSucceeds(
      setDoc(doc(dbAs(USER), 'redemptions', 'redemption-badge'), redemptionDoc(USER, badge, {
        redemptionId: 'redemption-badge',
      }))
    )
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'redemptions', 'redemption-badge'), {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      })
    )
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'redemptions', 'redemption-badge'), {
        status: 'fulfilled',
        pointsCost: 0,
        updatedAt: Timestamp.now(),
        fulfilledAt: Timestamp.now(),
      })
    )
    await assertDenied(deleteDoc(doc(dbAs(USER), 'redemptions', 'redemption-badge')))
    await assertDenied(getDoc(doc(dbAs(OTHER), 'redemptions', 'redemption-badge')))
    await assertDenied(getDocs(collection(dbAs(USER), 'redemptions')))
    await assertDenied(
      getDocs(query(collection(dbAs(USER), 'redemptions'), where('userId', '==', OTHER)))
    )
  })

  it('allows admins to read and update any redemption', async () => {
    await seedShop()
    await seed(async (db) => {
      await setDoc(doc(db, 'redemptions', 'redemption-badge'), {
        ...redemptionDoc(USER, badge, { redemptionId: 'redemption-badge' }),
        redeemedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    })
    await assertSucceeds(getDoc(doc(dbAs(ADMIN), 'redemptions', 'redemption-badge')))
    await assertSucceeds(getDocs(collection(dbAs(ADMIN), 'redemptions')))
    await assertSucceeds(
      updateDoc(doc(dbAs(ADMIN), 'redemptions', 'redemption-badge'), {
        status: 'cancelled',
        notes: 'Out of stock',
        updatedAt: Timestamp.now(),
      })
    )
    await assertSucceeds(deleteDoc(doc(dbAs(LISTED), 'redemptions', 'redemption-badge')))
  })

  it('does not check shop balance, so an unaffordable redemption is still allowed', async () => {
    await seedShop()
    await assertSucceeds(
      setDoc(
        doc(dbAs(USER), 'redemptions', 'redemption-unpaid'),
        redemptionDoc(USER, badge, { redemptionId: 'redemption-unpaid' })
      )
    )
  })
})

describe('referrals', () => {
  it('lets a participant read their referrals and blocks every client write', async () => {
    await seedAdmins()
    await seed(async (db) => {
      await setDoc(doc(db, 'referrals', 'ref-1'), {
        referrerUid: USER,
        referredUid: OTHER,
        referralCode: 'PLAYER1',
        status: 'completed',
        pointsAwarded: 5,
        createdAt: Timestamp.now(),
        completedAt: Timestamp.now(),
      })
    })

    await assertSucceeds(getDoc(doc(dbAs(USER), 'referrals', 'ref-1')))
    await assertSucceeds(getDoc(doc(dbAs(OTHER), 'referrals', 'ref-1')))
    await assertSucceeds(
      getDocs(query(collection(dbAs(USER), 'referrals'), where('referrerUid', '==', USER)))
    )
    await assertSucceeds(
      getDocs(
        query(
          collection(dbAs(USER), 'referrals'),
          where('referrerUid', '==', USER),
          where('referredUid', '==', OTHER)
        )
      )
    )

    await assertDenied(getDoc(doc(dbAs('stranger'), 'referrals', 'ref-1')))
    await assertDenied(getDoc(doc(dbAnon(), 'referrals', 'ref-1')))
    await assertDenied(getDocs(collection(dbAs(USER), 'referrals')))

    const payload = {
      referrerUid: USER,
      referredUid: 'new-user',
      referralCode: 'PLAYER1',
      status: 'completed',
      pointsAwarded: 5,
      createdAt: Timestamp.now(),
      completedAt: Timestamp.now(),
    }
    await assertDenied(setDoc(doc(dbAs(USER), 'referrals', 'ref-2'), payload))
    await assertDenied(setDoc(doc(dbAs(ADMIN), 'referrals', 'ref-2'), payload))
    await assertDenied(updateDoc(doc(dbAs(USER), 'referrals', 'ref-1'), { pointsAwarded: 100 }))
    await assertDenied(deleteDoc(doc(dbAs(ADMIN), 'referrals', 'ref-1')))
  })
})

describe('fixture search cache', () => {
  const cache = {
    from: '2026-11-01',
    to: '2026-11-08',
    league: 39,
    fixtures: [{ fixture: { id: FIXTURE_ID } }],
    cachedAt: Timestamp.now(),
  }

  it('allows admins to read and write fixture_searches and denies everyone else', async () => {
    await seedAdmins()
    await assertSucceeds(setDoc(doc(dbAs(ADMIN), 'fixture_searches', 'cache-1'), cache))
    await assertSucceeds(getDoc(doc(dbAs(LISTED), 'fixture_searches', 'cache-1')))
    await assertDenied(getDoc(doc(dbAs(USER), 'fixture_searches', 'cache-1')))
    await assertDenied(setDoc(doc(dbAs(USER), 'fixture_searches', 'cache-2'), cache))
    await assertDenied(getDoc(doc(dbAnon(), 'fixture_searches', 'cache-1')))
    await assertDenied(setDoc(doc(dbAnon(), 'fixture_searches', 'cache-3'), cache))
  })
})
