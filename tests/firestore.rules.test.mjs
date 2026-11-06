/**
 * Firestore security rules tests. Run with `npm run test:rules`.
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

const USER = 'user1'
const OTHER = 'user2'
const ADMIN = 'admin1'
const LISTED = 'listedadmin'
const FIXTURE_ID = 12345
const GAMEWEEK_ID = 'gw-1'

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

function predictionEntry(uid, fixtureId, gameweekId, pick = 'H', overrides = {}) {
  return {
    uid,
    fixtureId,
    gameweekId,
    pick,
    createdAt: serverTimestamp(),
    awarded: false,
    points: 0,
    correct: null,
    homeTeam: { id: 33, name: 'Manchester United', logo: 'h.png' },
    awayTeam: { id: 50, name: 'Manchester City', logo: 'a.png' },
    league: { id: 39, name: 'Premier League', country: '', logo: 'l.png' },
    fixtureDate: Timestamp.fromDate(new Date('2026-11-08T15:00:00Z')),
    status: 'TBP',
    result: null,
    ...overrides,
  }
}

function redemptionDoc(uid, item, overrides = {}) {
  const now = Timestamp.now()
  const redemptionId = overrides.redemptionId || `${uid}_${item.itemId}_n1`
  return {
    redemptionId,
    userId: uid,
    itemId: item.itemId,
    itemName: item.name,
    pointsCost: item.pointsCost,
    redeemedAt: now,
    status: 'pending',
    updatedAt: now,
    ...overrides,
    redemptionId,
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
      allowRegistrations: true,
      minRedemptionPoints: 0,
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
      points: 100,
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

async function seedPlayableFixture({
  gameweekId = GAMEWEEK_ID,
  fixtureId = FIXTURE_ID,
  shortStatus = 'NS',
  deadlineMs = 60 * 60 * 1000,
  forceOpenForTesting = false,
  gameweekStatus = 'active',
} = {}) {
  await seed(async (db) => {
    await setDoc(doc(db, 'gameweeks', gameweekId), {
      name: 'Gameweek',
      status: gameweekStatus,
      startDate: Timestamp.fromDate(new Date('2026-11-01T00:00:00Z')),
      deadline: Timestamp.fromDate(new Date(Date.now() + deadlineMs)),
      forceOpenForTesting,
      fixtureIds: [fixtureId],
    })
    await setDoc(doc(db, 'gameweeks', gameweekId, 'fixtures', String(fixtureId)), {
      fixtureId,
      fixture: { fixture: { status: { short: shortStatus } } },
    })
  })
}

function entryRef(database, uid = USER, fixtureId = FIXTURE_ID) {
  return doc(database, 'predictions', String(fixtureId), 'entries', uid)
}

function savePick(database, uid, pick = 'H', overrides = {}, fixtureId = FIXTURE_ID, gameweekId = GAMEWEEK_ID) {
  const batch = writeBatch(database)
  batch.set(doc(database, 'predictions', String(fixtureId)), { exists: true }, { merge: true })
  batch.set(entryRef(database, uid, fixtureId), predictionEntry(uid, fixtureId, gameweekId, pick, overrides), {
    merge: true,
  })
  return batch.commit()
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
  it('denies unknown collections and unexpected user subcollections', async () => {
    await assertDenied(getDoc(doc(dbAnon(), 'secrets', 'x')))
    await assertDenied(setDoc(doc(dbAs(USER), 'secrets', 'x'), { a: 1 }))
    await assertDenied(setDoc(doc(dbAnon(), 'secrets', 'x'), { a: 1 }))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER, 'secrets', 'x'), { a: 1 }))
  })
})

describe('users', () => {
  it('lets a signed-in user read profiles and hides them from signed-out clients', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', USER), {
        uid: USER,
        displayName: 'Player One',
        points: 12,
        referralCode: 'PLAYER1',
        isAdmin: false,
      })
      await setDoc(doc(db, 'users', OTHER), {
        uid: OTHER,
        displayName: 'Player Two',
        points: 4,
        referralCode: 'PLAYER2',
      })
    })

    await assertDenied(getDoc(doc(dbAnon(), 'users', USER)))
    await assertDenied(getDocs(query(collection(dbAnon(), 'users'), orderBy('points', 'desc'), limit(100))))
    await assertSucceeds(getDoc(doc(dbAs(USER), 'users', OTHER)))
    await assertSucceeds(getDocs(query(collection(dbAs(USER), 'users'), orderBy('points', 'desc'), limit(100))))
    await assertSucceeds(
      getDocs(query(collection(dbAs(USER), 'users'), where('referralCode', '==', 'PLAYER2')))
    )
  })

  it('allows the owner to create a zeroed profile', async () => {
    await assertSucceeds(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER)))
  })

  it('denies registration when allowRegistrations is false', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'settings', 'app'), { allowRegistrations: false, adminUids: [] })
    })
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER), newUserPayload(USER)))
  })

  it('denies a referral-code-only create when the profile is missing', async () => {
    await assertDenied(setDoc(doc(dbAs(USER), 'users', USER), { referralCode: 'PLAYER1' }, { merge: true }))
  })

  it('denies unauthenticated creates, creates for another uid, and protected fields', async () => {
    await assertDenied(setDoc(doc(dbAnon(), 'users', USER), newUserPayload(USER)))
    await assertDenied(setDoc(doc(dbAs(USER), 'users', OTHER), newUserPayload(OTHER)))
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

  it('allows typed profile updates and a one-time referral code backfill', async () => {
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
      setDoc(doc(userDb, 'users', USER), { language: 'es-MX', lastUpdated: serverTimestamp() }, { merge: true })
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
        favoritePlayer: null,
        lastUpdated: serverTimestamp(),
      })
    )

    await seed(async (db) => {
      await setDoc(doc(db, 'users', OTHER), {
        uid: OTHER,
        displayName: 'Other',
        points: 0,
        referralPoints: 0,
      })
    })
    await assertSucceeds(setDoc(doc(dbAs(OTHER), 'users', OTHER), { referralCode: 'OTHER99' }, { merge: true }))
  })

  it('denies type escapes and oversized profile fields', async () => {
    await seedExistingUser({ referralCode: null })
    const ref = doc(dbAs(USER), 'users', USER)
    await assertDenied(updateDoc(ref, { displayName: 123 }))
    await assertDenied(updateDoc(ref, { displayName: 'A' }))
    await assertDenied(updateDoc(ref, { displayName: 'A'.repeat(31) }))
    await assertSucceeds(updateDoc(ref, { displayName: 'José', lastUpdated: serverTimestamp() }))
    await assertDenied(updateDoc(ref, { photoURL: { url: 'https://example.com/p.png' } }))
    await assertDenied(updateDoc(ref, { photoURL: 'x'.repeat(2049) }))
    await assertDenied(updateDoc(ref, { hasSeenOnboardingIntro: 'true' }))
    await assertDenied(updateDoc(ref, { language: 'fr', lastUpdated: serverTimestamp() }))
    await assertDenied(updateDoc(ref, { referralCode: 12345 }))
    await assertDenied(updateDoc(ref, { referralCode: 'ab' }))
    await assertDenied(updateDoc(ref, { favoritePlayer: { id: '1', name: 'Star', photo: 's.png' } }))
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
    await assertDenied(updateDoc(ref, { pointsSpent: 5 }))
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
    await assertSucceeds(
      updateDoc(doc(dbAs(ADMIN), 'users', ADMIN), {
        displayName: 'Chief',
        lastUpdated: serverTimestamp(),
      })
    )
    const snap = await getDoc(doc(dbAs(ADMIN), 'users', ADMIN))
    assert.equal(snap.data().isAdmin, true)
    assert.equal(snap.data().displayName, 'Chief')
  })
})

describe('gameweek prediction cache', () => {
  it('allows only the owner to read and write a small cache', async () => {
    const ref = (database) => doc(database, 'users', USER, 'gameweek_predictions', 'gw-1')
    await assertSucceeds(
      setDoc(ref(dbAs(USER)), {
        predictions: { [String(FIXTURE_ID)]: 'H', '99': 'D' },
        updatedAt: serverTimestamp(),
      })
    )
    await assertSucceeds(getDoc(ref(dbAs(USER))))
    await assertDenied(getDoc(ref(dbAs(OTHER))))
    await assertDenied(getDoc(ref(dbAnon())))
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
  it('allows a pick before the deadline when the fixture is NS and in the gameweek', async () => {
    await seedPlayableFixture()
    await assertSucceeds(savePick(dbAs(USER), USER, 'H'))
    await assertSucceeds(savePick(dbAs(OTHER), OTHER, 'D'))
    await assertSucceeds(savePick(dbAs(USER), USER, 'A'))
    await assertDenied(getDocs(collection(dbAnon(), 'predictions', String(FIXTURE_ID), 'entries')))
    await assertSucceeds(getDocs(collection(dbAs(USER), 'predictions', String(FIXTURE_ID), 'entries')))
  })

  it('allows a pick after the deadline when forceOpenForTesting is set and the fixture is still NS', async () => {
    await seedPlayableFixture({ deadlineMs: -60 * 60 * 1000, forceOpenForTesting: true })
    await assertSucceeds(savePick(dbAs(USER), USER, 'H'))
  })

  it('denies a pick on a draft gameweek', async () => {
    await seedPlayableFixture({ gameweekStatus: 'draft' })
    await assertDenied(savePick(dbAs(USER), USER, 'H'))
  })

  it('allows a merge save that keeps a legacy ts field', async () => {
    await seedPlayableFixture()
    await seed(async (db) => {
      await setDoc(doc(db, 'predictions', String(FIXTURE_ID)), { exists: true })
      await setDoc(entryRef(db), {
        ...predictionEntry(USER, FIXTURE_ID, GAMEWEEK_ID, 'H', {
          createdAt: Timestamp.fromDate(new Date('2024-06-01T00:00:00Z')),
        }),
        ts: Timestamp.fromDate(new Date('2024-01-01T00:00:00Z')),
      })
    })
    await assertSucceeds(savePick(dbAs(USER), USER, 'A'))
    const snap = await getDoc(entryRef(dbAs(USER)))
    assert.equal(snap.data().pick, 'A')
    assert.ok(snap.data().ts)
  })

  it('denies a pick after the deadline', async () => {
    await seedPlayableFixture({ deadlineMs: -60 * 60 * 1000, forceOpenForTesting: false })
    await assertDenied(savePick(dbAs(USER), USER, 'H'))
  })

  it('denies a post-FT pick even when the deadline is open or force-open', async () => {
    await seedPlayableFixture({ shortStatus: 'FT' })
    await assertDenied(savePick(dbAs(USER), USER, 'H'))
    await testEnv.clearFirestore()
    await seedPlayableFixture({ shortStatus: 'FT', deadlineMs: -60 * 60 * 1000, forceOpenForTesting: true })
    await assertDenied(savePick(dbAs(USER), USER, 'H'))
  })

  it('denies a pick for a fixture that is not in the gameweek and a non-numeric parent id', async () => {
    await seedPlayableFixture()
    await assertDenied(savePick(dbAs(USER), USER, 'H', {}, FIXTURE_ID, 'gw-missing'))
    await assertDenied(
      setDoc(doc(dbAs(USER), 'predictions', 'not-a-number'), { exists: true })
    )
  })

  it('denies unauthenticated writes, cross-user writes, extra fields, and scoring writes', async () => {
    await seedPlayableFixture()
    await assertDenied(savePick(dbAnon(), USER, 'H'))
    await assertSucceeds(savePick(dbAs(USER), USER, 'H'))
    await assertDenied(setDoc(entryRef(dbAs(OTHER)), predictionEntry(USER, FIXTURE_ID, GAMEWEEK_ID, 'A')))
    await assertDenied(deleteDoc(entryRef(dbAs(USER))))
    await assertDenied(
      setDoc(doc(dbAs(USER), 'predictions', String(FIXTURE_ID)), { exists: true, awarded: true }, { merge: true })
    )
    await assertDenied(savePick(dbAs(USER), USER, 'H', { awarded: true }))
    await assertDenied(savePick(dbAs(USER), USER, 'H', { points: 5 }))
    await assertDenied(savePick(dbAs(USER), USER, 'H', { points: -1 }))
    await assertDenied(savePick(dbAs(USER), USER, 'X'))
    await assertDenied(savePick(dbAs(USER), USER, 'H', { correct: true }))
    await assertDenied(savePick(dbAs(USER), USER, 'H', { hacked: true }))
    await assertDenied(
      savePick(dbAs(USER), USER, 'H', {
        homeTeam: { id: 1, name: 'N'.repeat(81), logo: 'h.png' },
      })
    )
  })

  it('denies resetting points on an unawarded entry and any write after awarded', async () => {
    await seedPlayableFixture()
    await seed(async (db) => {
      await setDoc(doc(db, 'predictions', String(FIXTURE_ID)), { exists: true })
      await setDoc(entryRef(db), {
        ...predictionEntry(USER, FIXTURE_ID, GAMEWEEK_ID, 'H', { createdAt: Timestamp.now() }),
        points: 1,
        awarded: false,
        correct: null,
      })
    })
    await assertDenied(savePick(dbAs(USER), USER, 'A'))

    await seed(async (db) => {
      await setDoc(entryRef(db), {
        uid: USER,
        fixtureId: FIXTURE_ID,
        gameweekId: GAMEWEEK_ID,
        pick: 'H',
        awarded: true,
        points: 1,
        correct: true,
      })
    })
    await assertDenied(savePick(dbAs(USER), USER, 'A'))
    await assertDenied(updateDoc(entryRef(dbAs(USER)), { awarded: false, points: 0, correct: null, pick: 'A' }))
  })
})

describe('gameweeks', () => {
  it('allows signed-out reads of published gameweeks and hides drafts', async () => {
    await seedAdmins()
    await seed(async (db) => {
      await setDoc(doc(db, 'gameweeks', 'gw-live'), {
        name: 'Live',
        status: 'active',
        startDate: Timestamp.fromDate(new Date('2026-11-01T00:00:00Z')),
        deadline: Timestamp.fromDate(new Date('2026-11-08T14:00:00Z')),
      })
      await setDoc(doc(db, 'gameweeks', 'gw-live', 'fixtures', String(FIXTURE_ID)), { fixtureId: FIXTURE_ID })
      await setDoc(doc(db, 'gameweeks', 'gw-draft'), {
        name: 'Draft',
        status: 'draft',
        startDate: Timestamp.fromDate(new Date('2026-10-01T00:00:00Z')),
      })
      await setDoc(doc(db, 'gameweeks', 'gw-draft', 'fixtures', '9'), { fixtureId: 9 })
    })

    const anon = dbAnon()
    await assertSucceeds(
      getDocs(query(collection(anon, 'gameweeks'), where('status', '==', 'active'), orderBy('startDate', 'desc')))
    )
    await assertSucceeds(
      getDocs(
        query(collection(dbAs(USER), 'gameweeks'), where('status', 'in', ['active', 'completed', 'archived']), orderBy('startDate', 'desc'))
      )
    )
    await assertSucceeds(getDocs(collection(anon, 'gameweeks', 'gw-live', 'fixtures')))
    await assertSucceeds(getDoc(doc(anon, 'gameweeks', 'gw-live')))
    await assertDenied(getDoc(doc(anon, 'gameweeks', 'gw-draft')))
    await assertDenied(getDoc(doc(dbAs(USER), 'gameweeks', 'gw-draft')))
    await assertDenied(getDocs(collection(dbAs(USER), 'gameweeks', 'gw-draft', 'fixtures')))
    await assertDenied(getDocs(query(collection(dbAs(USER), 'gameweeks'), orderBy('startDate', 'desc'))))
    await assertSucceeds(getDoc(doc(dbAs(ADMIN), 'gameweeks', 'gw-draft')))
    await assertSucceeds(getDocs(query(collection(dbAs(ADMIN), 'gameweeks'), orderBy('startDate', 'desc'))))
  })

  it('allows admin flag and adminUids editors to write gameweeks and fixtures', async () => {
    await seedAdmins()
    await assertSucceeds(
      setDoc(doc(dbAs(ADMIN), 'gameweeks', 'gw-new'), {
        gameweekId: 'gw-new',
        name: 'Gameweek',
        status: 'draft',
        startDate: Timestamp.now(),
        deadline: Timestamp.now(),
        fixtureIds: [FIXTURE_ID],
        createdBy: ADMIN,
      })
    )
    await assertSucceeds(
      updateDoc(doc(dbAs(ADMIN), 'gameweeks', 'gw-new'), {
        status: 'active',
        forceOpenForTesting: true,
        updatedAt: Timestamp.now(),
      })
    )
    const listed = dbAs(LISTED)
    await assertSucceeds(
      setDoc(doc(listed, 'gameweeks', 'gw-new', 'fixtures', String(FIXTURE_ID)), {
        fixtureId: FIXTURE_ID,
        addedBy: LISTED,
        addedAt: Timestamp.now(),
      })
    )
    await assertSucceeds(deleteDoc(doc(listed, 'gameweeks', 'gw-new', 'fixtures', String(FIXTURE_ID))))
    await assertSucceeds(deleteDoc(doc(dbAs(ADMIN), 'gameweeks', 'gw-new')))
  })

  it('denies non-admin gameweek writes and non-admin settings reads', async () => {
    await seedAdmins()
    await seed(async (db) => {
      await setDoc(doc(db, 'gameweeks', 'gw-1'), {
        name: 'GW',
        status: 'active',
        startDate: Timestamp.now(),
      })
    })
    await assertDenied(setDoc(doc(dbAs(USER), 'gameweeks', 'gw-x'), { name: 'Hack', status: 'active' }))
    await assertDenied(updateDoc(doc(dbAs(USER), 'gameweeks', 'gw-1'), { status: 'completed' }))
    await assertDenied(deleteDoc(doc(dbAnon(), 'gameweeks', 'gw-1')))
    await assertDenied(setDoc(doc(dbAs(USER), 'gameweeks', 'gw-1', 'fixtures', '1'), { fixtureId: 1 }))
    await assertDenied(getDoc(doc(dbAnon(), 'settings', 'app')))
    await assertDenied(getDoc(doc(dbAs(USER), 'settings', 'app')))
    await assertSucceeds(getDoc(doc(dbAs(ADMIN), 'settings', 'app')))
    await assertSucceeds(getDoc(doc(dbAs(LISTED), 'settings', 'app')))
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

  it('denies a non-admin creating settings/app', async () => {
    await assertDenied(
      setDoc(doc(dbAs(USER), 'settings', 'app'), {
        adminUids: [USER],
        appName: 'Banger Picks',
      })
    )
  })
})

describe('shop items and redemptions', () => {
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

  function favoriteItem(count) {
    const optionsById = {}
    for (let i = 1; i <= count; i += 1) {
      optionsById[String(i)] = {
        playerId: i,
        name: `Player ${i}`,
        photo: `p${i}.png`,
        pointsCost: 10 + i,
      }
    }
    return {
      itemId: 'item-fav',
      name: 'Favorite Player Photo',
      pointsCost: 11,
      status: 'active',
      category: 'digital',
      customization: { type: 'favoritePlayer', optionsById },
      createdAt: Timestamp.now(),
    }
  }

  async function seedShop({
    correctPredictions = 100,
    referralPoints = 0,
    pointsSpent = 0,
    writePointsSpent = true,
    shopEnabled = true,
    minRedemptionPoints = 0,
    shirtStatus = 'active',
  } = {}) {
    await seed(async (db) => {
      await setDoc(doc(db, 'users', ADMIN), { uid: ADMIN, isAdmin: true, displayName: 'Admin', points: 0 })
      await setDoc(doc(db, 'settings', 'app'), {
        adminUids: [LISTED],
        shopEnabled,
        allowRegistrations: true,
        minRedemptionPoints,
      })
      await setDoc(doc(db, 'users', USER), {
        uid: USER,
        displayName: 'Player One',
        points: 40,
        correctPredictions,
        referralPoints,
        ...(writePointsSpent ? { pointsSpent } : {}),
      })
      await setDoc(doc(db, 'shopItems', badge.itemId), badge)
      await setDoc(doc(db, 'shopItems', shirt.itemId), { ...shirt, status: shirtStatus, stock: 3 })
    })
  }

  function placeRedemption(database, uid, item, nonce, extra = {}, withStock = item.stock != null) {
    const redemptionId = extra.redemptionId || `${uid}_${item.itemId}_${nonce}`
    const cost = extra.pointsCost != null ? extra.pointsCost : item.pointsCost
    const batch = writeBatch(database)
    batch.set(
      doc(database, 'redemptions', redemptionId),
      redemptionDoc(uid, item, { redemptionId, ...extra })
    )
    batch.update(doc(database, 'users', uid), {
      pointsSpent: increment(cost),
      lastShopRedemptionId: redemptionId,
    })
    if (withStock) {
      batch.update(doc(database, 'shopItems', item.itemId), {
        stock: increment(-1),
        updatedAt: serverTimestamp(),
        lastRedemptionId: redemptionId,
      })
    }
    return batch.commit()
  }

  it('allows public shop reads used by the shop page', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'shopItems', badge.itemId), badge)
    })
    await assertSucceeds(
      getDocs(query(collection(dbAnon(), 'shopItems'), where('status', '==', 'active'), orderBy('createdAt', 'desc')))
    )
    await assertSucceeds(
      getDocs(query(collection(dbAnon(), 'shopItems'), where('status', '==', 'active'), orderBy('pointsCost', 'asc')))
    )
    await assertSucceeds(
      getDocs(query(collection(dbAnon(), 'shopItems'), where('status', '==', 'active'), orderBy('name', 'asc')))
    )
  })

  it('allows a redemption when points cover the cost and the shop is enabled', async () => {
    await seedShop()
    const database = dbAs(USER)
    const redemptionId = `${USER}_${badge.itemId}_n1`
    await assertSucceeds(placeRedemption(database, USER, badge, 'n1'))
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
  })

  it('denies unpaid, below-minimum, inactive, and shop-disabled redemptions', async () => {
    await seedShop({ correctPredictions: 10 })
    await assertDenied(placeRedemption(dbAs(USER), USER, badge, 'poor'))

    await testEnv.clearFirestore()
    await seedShop({ correctPredictions: 40, minRedemptionPoints: 50 })
    await assertDenied(placeRedemption(dbAs(USER), USER, shirt, 'min'))

    await testEnv.clearFirestore()
    await seedShop({ shirtStatus: 'inactive' })
    await assertDenied(placeRedemption(dbAs(USER), USER, shirt, 'off'))

    await testEnv.clearFirestore()
    await seedShop({ shopEnabled: false })
    await assertDenied(placeRedemption(dbAs(USER), USER, badge, 'closed'))
  })

  it('allows a referral-only balance once and denies a repeated redemption past it', async () => {
    await seedShop({ correctPredictions: 0, referralPoints: 50, writePointsSpent: false })
    const database = dbAs(USER)
    await assertSucceeds(placeRedemption(database, USER, badge, 'ref1'))
    const after = await getDoc(doc(database, 'users', USER))
    assert.equal(after.data().pointsSpent, 50)
    await assertDenied(placeRedemption(database, USER, badge, 'ref2'))
  })

  it('allows a favorite-player option past the old 27-option scan and rejects a mismatched price', async () => {
    await seedShop()
    const item = favoriteItem(30)
    await seed(async (db) => {
      await setDoc(doc(db, 'shopItems', item.itemId), item)
    })
    const player = item.customization.optionsById['30']
    const databaseForRedeem = dbAs(USER)
    const redemptionId = `${USER}_${item.itemId}_star`
    await assertSucceeds(
      placeRedemption(databaseForRedeem, USER, item, 'star', {
        pointsCost: player.pointsCost,
        redemptionData: {
          playerId: player.playerId,
          playerName: player.name,
          playerPhoto: player.photo,
          pointsCost: player.pointsCost,
          playerKey: '30',
        },
      })
    )
    const database = dbAs(USER)
    const batch = writeBatch(database)
    batch.update(doc(database, 'users', USER), {
      favoritePlayer: { id: player.playerId, name: player.name, photo: player.photo },
      favoritePlayerRedemptionId: redemptionId,
      lastUpdated: serverTimestamp(),
    })
    batch.update(doc(database, 'redemptions', redemptionId), {
      status: 'fulfilled',
      updatedAt: serverTimestamp(),
      fulfilledAt: serverTimestamp(),
    })
    await assertSucceeds(batch.commit())

    await assertDenied(
      placeRedemption(dbAs(USER), USER, item, 'cheap', {
        pointsCost: 11,
        redemptionData: {
          playerId: 30,
          playerName: player.name,
          playerPhoto: player.photo,
          pointsCost: 11,
          playerKey: '1',
        },
      })
    )
  })

  it('denies setting favoritePlayer without that redemption', async () => {
    await seedShop()
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'users', USER), {
        favoritePlayer: { id: 30, name: 'Player 30', photo: 'p30.png' },
        lastUpdated: serverTimestamp(),
      })
    )
  })

  it('allows a stock decrement only in the same batch as a new redemption', async () => {
    await seedShop()
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'shopItems', shirt.itemId), {
        stock: increment(-1),
        updatedAt: serverTimestamp(),
      })
    )
    await assertSucceeds(placeRedemption(dbAs(USER), USER, shirt, 'buy1'))
    const snap = await getDoc(doc(dbAs(USER), 'shopItems', shirt.itemId))
    assert.equal(snap.data().stock, 2)
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'shopItems', shirt.itemId), {
        stock: increment(-2),
        updatedAt: serverTimestamp(),
      })
    )
  })

  it('lets an owner move pending to fulfilled and blocks cancelled to fulfilled', async () => {
    await seedShop()
    const pendingId = `${USER}_${badge.itemId}_pend`
    await assertSucceeds(placeRedemption(dbAs(USER), USER, badge, 'pend'))
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'redemptions', pendingId), {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      })
    )
    await assertSucceeds(
      updateDoc(doc(dbAs(USER), 'redemptions', pendingId), {
        status: 'fulfilled',
        updatedAt: Timestamp.now(),
        fulfilledAt: Timestamp.now(),
      })
    )
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'redemptions', pendingId), {
        status: 'fulfilled',
        updatedAt: Timestamp.now(),
        fulfilledAt: Timestamp.now(),
      })
    )

    const cancelledId = `${USER}_${badge.itemId}_stop`
    await seed(async (db) => {
      await setDoc(doc(db, 'redemptions', cancelledId), {
        ...redemptionDoc(USER, badge, { redemptionId: cancelledId }),
        status: 'cancelled',
        redeemedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    })
    await assertDenied(
      updateDoc(doc(dbAs(USER), 'redemptions', cancelledId), {
        status: 'fulfilled',
        updatedAt: Timestamp.now(),
        fulfilledAt: Timestamp.now(),
      })
    )
    await assertSucceeds(
      updateDoc(doc(dbAs(ADMIN), 'redemptions', cancelledId), {
        status: 'fulfilled',
        updatedAt: Timestamp.now(),
        fulfilledAt: Timestamp.now(),
      })
    )
  })

  it('denies a physical redemption that does not decrement stock', async () => {
    await seedShop()
    await assertDenied(placeRedemption(dbAs(USER), USER, shirt, 'nostock', {}, false))
  })

  it('denies two redemptions sharing one stock decrement', async () => {
    await seedShop()
    const database = dbAs(USER)
    const firstId = `${USER}_${shirt.itemId}_a`
    const secondId = `${USER}_${shirt.itemId}_b`
    const batch = writeBatch(database)
    batch.set(doc(database, 'redemptions', firstId), redemptionDoc(USER, shirt, { redemptionId: firstId }))
    batch.set(doc(database, 'redemptions', secondId), redemptionDoc(USER, shirt, { redemptionId: secondId }))
    batch.update(doc(database, 'users', USER), {
      pointsSpent: increment(shirt.pointsCost),
      lastShopRedemptionId: firstId,
    })
    batch.update(doc(database, 'shopItems', shirt.itemId), {
      stock: increment(-1),
      updatedAt: serverTimestamp(),
      lastRedemptionId: firstId,
    })
    await assertDenied(batch.commit())
  })

  it('denies forged prices, cross-user creates, and non-owner reads', async () => {
    await seedShop()
    await assertDenied(
      placeRedemption(dbAs(USER), USER, badge, 'cheap', { pointsCost: 1 })
    )
    await assertDenied(
      placeRedemption(dbAs(USER), USER, badge, 'x', { userId: OTHER, redemptionId: `${OTHER}_${badge.itemId}_x` })
    )
    await assertDenied(getDocs(collection(dbAs(USER), 'redemptions')))
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
    await assertDenied(getDoc(doc(dbAs('stranger'), 'referrals', 'ref-1')))
    await assertDenied(getDoc(doc(dbAnon(), 'referrals', 'ref-1')))
    const payload = {
      referrerUid: USER,
      referredUid: 'newuser',
      referralCode: 'PLAYER1',
      status: 'completed',
      pointsAwarded: 5,
      createdAt: Timestamp.now(),
      completedAt: Timestamp.now(),
    }
    await assertDenied(setDoc(doc(dbAs(USER), 'referrals', 'ref-2'), payload))
    await assertDenied(setDoc(doc(dbAs(ADMIN), 'referrals', 'ref-2'), payload))
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
  })
})
