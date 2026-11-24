/**
 * Competition catalog reads/writes (Firestore).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  type Query,
  type QueryDocumentSnapshot,
  type DocumentData,
  increment,
} from 'firebase/firestore'
import { db } from './firebase'
import { normalizeJoinCode } from './join-code.mjs'
import {
  getQuerySnapshotServerPreferring,
  type LoadBudget,
} from './firestore-server-read'
import {
  isNonRetryableFirestoreError,
  isFirestoreCatalogSkippableError,
} from './firestore-utils'
import type { DashboardFirestoreReadOptions } from './admin'
import type {
  CompetitionDocument,
  CompetitionMembership,
  CompetitionPlayCard,
  CompetitionKind,
  CompetitionVisibility,
  CompetitionStatus,
} from '@/types/competition'
import { DEFAULT_FLAGSHIP_ID } from './competition-catalog.mjs'
import {
  getGameweekById,
  getAllGameweeks,
  type AdminGameweekData,
} from './admin'
import { convertAdminGameweekToGameweekData } from './convert-gameweek-data'
import type { GameweekData } from '@/types/dashboard'
import {
  competitionIdForGameweek,
  listCompetitionIdsFromGameweeks,
  isCompetitionComingSoon,
} from './competition-catalog.mjs'
import { resolveCompetitionDisplayName } from './competition-display'

export type CreateCompetitionInput = {
  competitionId: string
  displayName: string
  displayName_esMX?: string
  kind: CompetitionKind
  visibility: CompetitionVisibility
  featured?: boolean
  featuredRank?: number
  joinCode?: string
  joinCodeEnabled?: boolean
  activeSeasonId?: string | null
  ownerUid?: string
}

function mapCompetitionDoc(
  id: string,
  data: DocumentData
): CompetitionDocument {
  return {
    competitionId: id,
    displayName: (data.displayName as string) || id,
    displayName_esMX: data.displayName_esMX as string | undefined,
    kind: (data.kind as CompetitionKind) || 'community',
    visibility: (data.visibility as CompetitionVisibility) || 'public',
    joinCode: data.joinCode as string | undefined,
    joinCodeEnabled: data.joinCodeEnabled as boolean | undefined,
    maxMembers: data.maxMembers as number | undefined,
    memberCount: data.memberCount as number | undefined,
    featured: data.featured as boolean | undefined,
    featuredRank: data.featuredRank as number | undefined,
    activeGameweekId: data.activeGameweekId as string | null | undefined,
    status: (data.status as CompetitionStatus) || 'active',
    ownerUid: data.ownerUid as string | undefined,
    activeSeasonId: data.activeSeasonId as string | null | undefined,
    searchKeywords: data.searchKeywords as string[] | undefined,
    opensAt: (data.opensAt as CompetitionDocument['opensAt']) ?? null,
    tagline: data.tagline as string | undefined,
    tagline_esMX: data.tagline_esMX as string | undefined,
    primaryLeagueId: data.primaryLeagueId as number | undefined,
    createdAt: data.createdAt as CompetitionDocument['createdAt'],
    updatedAt: data.updatedAt as CompetitionDocument['updatedAt'],
  }
}

function displayNameSearchKey(name: string): string {
  return name.trim().toLowerCase()
}

export async function getCompetitionById(
  competitionId: string
): Promise<CompetitionDocument | null> {
  const snap = await getDoc(doc(db, 'competitions', competitionId))
  if (!snap.exists()) return null
  return mapCompetitionDoc(snap.id, snap.data())
}

/** Same as getCompetitionById but returns null when rules block catalog reads. */
export async function safeGetCompetitionById(
  competitionId: string
): Promise<CompetitionDocument | null> {
  try {
    return await getCompetitionById(competitionId)
  } catch (err) {
    if (isNonRetryableFirestoreError(err)) {
      return null
    }
    throw err
  }
}

async function queryCompetitions(
  q: Query<DocumentData>,
  opts: DashboardFirestoreReadOptions | undefined,
  timeoutMessage: string
) {
  if (opts?.serverPreferring && opts.budget) {
    const result = await getQuerySnapshotServerPreferring(q, {
      budget: opts.budget,
      timeoutMessage,
      staleWhileRevalidate: opts.staleWhileRevalidate,
    })
    if (opts.servedFromCacheRef && result.servedFromCache) {
      opts.servedFromCacheRef.current = true
    }
    return result.data
  }
  return getDocs(q)
}

export async function getFeaturedCompetitions(
  max = 12,
  opts?: DashboardFirestoreReadOptions
): Promise<CompetitionDocument[]> {
  try {
    return await loadFeaturedCompetitions(max, opts)
  } catch (err) {
    if (isFirestoreCatalogSkippableError(err)) {
      return []
    }
    throw err
  }
}

async function loadFeaturedCompetitions(
  max: number,
  opts?: DashboardFirestoreReadOptions
): Promise<CompetitionDocument[]> {
  // Avoid featured+featuredRank composite while indexes deploy; sort client-side.
  const qPublic = query(
    collection(db, 'competitions'),
    where('visibility', '==', 'public'),
    where('status', '==', 'active'),
    limit(max)
  )

  try {
    const snap = await queryCompetitions(qPublic, opts, 'Failed to load competitions')
    const rows = snap.docs.map((d) => mapCompetitionDoc(d.id, d.data()))
    return rows.sort((a, b) => {
      const fa = a.featured ? 0 : 1
      const fb = b.featured ? 0 : 1
      if (fa !== fb) return fa - fb
      return (a.featuredRank ?? 999) - (b.featuredRank ?? 999)
    })
  } catch (err) {
    if (isFirestoreCatalogSkippableError(err)) {
      return []
    }
    throw err
  }
}

export async function getMyCompetitions(
  uid: string,
  _opts?: DashboardFirestoreReadOptions
): Promise<CompetitionDocument[]> {
  try {
    const memSnap = await getDocs(collection(db, 'users', uid, 'competitions'))
    const comps = await Promise.all(
      memSnap.docs.map(async (mem) => {
        try {
          return await getCompetitionById(mem.id)
        } catch (err) {
          if (isNonRetryableFirestoreError(err)) return null
          throw err
        }
      })
    )
    return comps.filter((c): c is CompetitionDocument => Boolean(c && c.status !== 'archived'))
  } catch (err) {
    if (isFirestoreCatalogSkippableError(err)) {
      return []
    }
    throw err
  }
}

export type DiscoverCompetitionsResult = {
  items: CompetitionDocument[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
}

export async function discoverPublicCompetitions(options: {
  pageSize?: number
  startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null
  searchQuery?: string
}): Promise<DiscoverCompetitionsResult> {
  const pageSize = options.pageSize ?? 20
  const search = options.searchQuery?.trim().toLowerCase() ?? ''

  let q
  if (search.length >= 2) {
    const end = search + '\uf8ff'
    q = query(
      collection(db, 'competitions'),
      where('visibility', '==', 'public'),
      where('status', '==', 'active'),
      where('displayNameSearch', '>=', search),
      where('displayNameSearch', '<=', end),
      orderBy('displayNameSearch'),
      limit(pageSize)
    )
  } else if (options.startAfterDoc) {
    q = query(
      collection(db, 'competitions'),
      where('visibility', '==', 'public'),
      where('status', '==', 'active'),
      orderBy('displayNameSearch'),
      startAfter(options.startAfterDoc),
      limit(pageSize)
    )
  } else {
    q = query(
      collection(db, 'competitions'),
      where('visibility', '==', 'public'),
      where('status', '==', 'active'),
      orderBy('displayNameSearch'),
      limit(pageSize)
    )
  }

  try {
    const snap = await getDocs(q)
    const items = snap.docs.map((d) => mapCompetitionDoc(d.id, d.data()))
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
    return { items, lastDoc }
  } catch (err) {
    if (isFirestoreCatalogSkippableError(err)) {
      return { items: [], lastDoc: null }
    }
    throw err
  }
}

export async function resolveJoinCodeToCompetitionId(
  rawCode: string
): Promise<string | null> {
  const code = normalizeJoinCode(rawCode)
  if (!code) return null
  const snap = await getDoc(doc(db, 'joinCodes', code))
  if (!snap.exists()) return null
  const competitionId = snap.data()?.competitionId as string | undefined
  return competitionId?.trim() || null
}

export async function joinCompetition(
  uid: string,
  competitionId: string
): Promise<{ ok: true } | { ok: false; reason: 'not-found' | 'full' | 'archived' }> {
  const comp = await getCompetitionById(competitionId)
  if (!comp) return { ok: false, reason: 'not-found' }
  if (comp.status === 'archived' || comp.status === 'paused') {
    return { ok: false, reason: 'archived' }
  }
  if (
    typeof comp.maxMembers === 'number' &&
    typeof comp.memberCount === 'number' &&
    comp.memberCount >= comp.maxMembers
  ) {
    return { ok: false, reason: 'full' }
  }

  const memRef = doc(db, 'users', uid, 'competitions', competitionId)
  const existing = await getDoc(memRef)
  if (!existing.exists()) {
    const membership: CompetitionMembership & { competitionId: string } = {
      competitionId,
      joinedAt: Timestamp.now(),
      role: 'member',
    }
    await setDoc(memRef, membership)
    await updateDoc(doc(db, 'competitions', competitionId), {
      memberCount: increment(1),
      updatedAt: Timestamp.now(),
    }).catch(() => {
      /* rules may deny memberCount bump for non-admin */
    })
  }

  return { ok: true }
}

export async function joinCompetitionByCode(
  uid: string,
  rawCode: string
): Promise<
  | { ok: true; competitionId: string }
  | { ok: false; reason: 'invalid' | 'not-found' | 'full' | 'archived' }
> {
  const competitionId = await resolveJoinCodeToCompetitionId(rawCode)
  if (!competitionId) return { ok: false, reason: 'invalid' }
  const result = await joinCompetition(uid, competitionId)
  if (!result.ok) return { ok: false, reason: result.reason }
  return { ok: true, competitionId }
}

export async function createCompetition(
  input: CreateCompetitionInput
): Promise<void> {
  const now = Timestamp.now()
  const id = input.competitionId.trim()
  const displayName = input.displayName.trim()
  const payload = {
    displayName,
    displayName_esMX: input.displayName_esMX?.trim() || displayName,
    displayNameSearch: displayNameSearchKey(displayName),
    kind: input.kind,
    visibility: input.visibility,
    featured: input.featured === true,
    featuredRank: input.featuredRank ?? 100,
    joinCode: input.joinCode,
    joinCodeEnabled: input.joinCodeEnabled === true,
    status: 'active' as CompetitionStatus,
    memberCount: 0,
    activeGameweekId: null,
    activeSeasonId: input.activeSeasonId ?? null,
    ownerUid: input.ownerUid,
    searchKeywords: [displayNameSearchKey(displayName)],
    createdAt: now,
    updatedAt: now,
  }
  await setDoc(doc(db, 'competitions', id), payload)

  if (input.joinCode && input.joinCodeEnabled) {
    const code = normalizeJoinCode(input.joinCode)
    await setDoc(doc(db, 'joinCodes', code), { competitionId: id })
  }
}

export async function updateCompetition(
  competitionId: string,
  patch: Partial<CreateCompetitionInput> & { status?: CompetitionStatus; activeGameweekId?: string | null }
): Promise<void> {
  const ref = doc(db, 'competitions', competitionId)
  const update: Record<string, unknown> = { updatedAt: Timestamp.now() }
  if (patch.displayName !== undefined) {
    update.displayName = patch.displayName.trim()
    update.displayNameSearch = displayNameSearchKey(patch.displayName)
  }
  if (patch.displayName_esMX !== undefined) update.displayName_esMX = patch.displayName_esMX
  if (patch.kind !== undefined) update.kind = patch.kind
  if (patch.visibility !== undefined) update.visibility = patch.visibility
  if (patch.featured !== undefined) update.featured = patch.featured
  if (patch.featuredRank !== undefined) update.featuredRank = patch.featuredRank
  if (patch.status !== undefined) update.status = patch.status
  if (patch.activeGameweekId !== undefined) update.activeGameweekId = patch.activeGameweekId
  if (patch.activeSeasonId !== undefined) update.activeSeasonId = patch.activeSeasonId
  if (patch.joinCodeEnabled !== undefined) update.joinCodeEnabled = patch.joinCodeEnabled
  if (patch.joinCode !== undefined) {
    update.joinCode = patch.joinCode
    if (patch.joinCodeEnabled) {
      const code = normalizeJoinCode(patch.joinCode)
      await setDoc(doc(db, 'joinCodes', code), { competitionId })
    }
  }
  await updateDoc(ref, update)
}

export async function resolveCompetitionForAdminGameweek(
  gw: AdminGameweekData
): Promise<CompetitionDocument> {
  const id = competitionIdForGameweek(gw)
  const doc = await safeGetCompetitionById(id)
  return doc ?? syntheticCompetitionFromGameweek(gw)
}

export function syntheticCompetitionFromGameweek(
  gw: AdminGameweekData
): CompetitionDocument {
  const competitionId = competitionIdForGameweek(gw)
  const kind: CompetitionKind =
    gw.type === 'league' ? 'league' : gw.type === 'cup' ? 'cup' : 'flagship'
  return {
    competitionId,
    displayName: competitionId === DEFAULT_FLAGSHIP_ID ? 'Banger World' : gw.name,
    kind,
    visibility: 'public',
    featured: competitionId === DEFAULT_FLAGSHIP_ID,
    featuredRank: competitionId === DEFAULT_FLAGSHIP_ID ? 0 : 50,
    activeGameweekId: gw.gameweekId,
    status: 'active',
  }
}

export async function syncCompetitionActiveGameweek(
  competitionId: string,
  gameweekId: string
): Promise<void> {
  const compRef = doc(db, 'competitions', competitionId)
  const snap = await getDoc(compRef)
  if (!snap.exists()) return
  await updateDoc(compRef, {
    activeGameweekId: gameweekId,
    updatedAt: Timestamp.now(),
  })
}

/**
 * Home row: featured + my competitions, deduped; falls back to active gameweeks when catalog empty.
 * Competitions with no round yet but a scheduled `opensAt` come back in `comingSoon`.
 */
export async function loadHomeCompetitionPlayCards(
  uid: string | null | undefined,
  opts?: DashboardFirestoreReadOptions
): Promise<{
  cards: CompetitionPlayCard[]
  comingSoon: CompetitionDocument[]
  gameweeksById: Map<string, GameweekData>
}> {
  const [rawGameweeks, featured, mine] = await Promise.all([
    loadActiveGameweeksForHome(opts),
    getFeaturedCompetitions(12, opts).catch(() => [] as CompetitionDocument[]),
    uid ? getMyCompetitions(uid, opts).catch(() => [] as CompetitionDocument[]) : Promise.resolve([] as CompetitionDocument[]),
  ])

  const merged = new Map<string, CompetitionDocument>()
  for (const c of featured) merged.set(c.competitionId, c)
  for (const c of mine) merged.set(c.competitionId, c)

  let competitions = [...merged.values()]

  if (competitions.length === 0) {
    competitions = rawGameweeks.map(syntheticCompetitionFromGameweek)
  }

  const gameweeksById = new Map<string, GameweekData>()
  for (const gw of rawGameweeks) {
    gameweeksById.set(gw.gameweekId, convertAdminGameweekToGameweekData(gw))
  }

  const cards: CompetitionPlayCard[] = []
  const comingSoon: CompetitionDocument[] = []

  for (const comp of competitions) {
    let gwId = comp.activeGameweekId || null
    if (!gwId) {
      const activeGw = rawGameweeks.find(
        (g) => competitionIdForGameweek(g) === comp.competitionId && g.status === 'active'
      )
      gwId = activeGw?.gameweekId ?? null
    }
    if (!gwId) {
      const match = rawGameweeks.find(
        (g) => competitionIdForGameweek(g) === comp.competitionId
      )
      gwId = match?.gameweekId ?? null
    }
    if (!gwId) {
      if (isCompetitionComingSoon(comp)) comingSoon.push(comp)
      continue
    }
    if (!gameweeksById.has(gwId)) {
      try {
        const gw = await getGameweekById(gwId)
        if (gw) {
          gameweeksById.set(gw.gameweekId, convertAdminGameweekToGameweekData(gw))
        } else {
          continue
        }
      } catch {
        continue
      }
    }

    const gwData = gameweeksById.get(gwId)
    if (!gwData) continue

    cards.push({
      competition: comp,
      gameweekId: gwId,
      playerCount: gwData.playerCount ?? 0,
    })
  }

  return { cards, comingSoon, gameweeksById }
}

async function loadActiveGameweeksForHome(
  opts?: DashboardFirestoreReadOptions
): Promise<AdminGameweekData[]> {
  let rawGameweeks = await getAllGameweeks(
    { status: 'active', sortBy: 'date', sortOrder: 'desc' },
    opts
  )
  if (rawGameweeks.length === 0) {
    rawGameweeks = await getAllGameweeks(
      { status: 'completed', sortBy: 'date', sortOrder: 'desc' },
      opts
    )
  }
  return rawGameweeks
}

/** Paid private host creation — gated until Stripe entitlements. */
export async function createPrivateCompetitionIfEntitled(
  _uid: string,
  _input: Omit<CreateCompetitionInput, 'visibility'>
): Promise<{ ok: false; reason: 'paid-feature' }> {
  return { ok: false, reason: 'paid-feature' }
}

export async function listPublicCompetitionSummaries(): Promise<CompetitionDocument[]> {
  const { items } = await discoverPublicCompetitions({ pageSize: 100 })
  return items
}

export type CompetitionPickerOption = { id: string; label: string }

export type BuildRankingsCompetitionOptionsInput = {
  uid?: string | null
  locale?: string
}

function sortRankingsCompetitionOptions(
  options: CompetitionPickerOption[]
): CompetitionPickerOption[] {
  return [...options].sort((a, b) => {
    if (a.id === DEFAULT_FLAGSHIP_ID) return -1
    if (b.id === DEFAULT_FLAGSHIP_ID) return 1
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  })
}

export async function buildRankingsCompetitionOptions(
  allGameweeks: AdminGameweekData[],
  opts?: BuildRankingsCompetitionOptionsInput
): Promise<CompetitionPickerOption[]> {
  const locale = opts?.locale ?? 'en'
  const ids = new Set(listCompetitionIdsFromGameweeks(allGameweeks))

  const [publicDocs, myDocs] = await Promise.all([
    listPublicCompetitionSummaries().catch(() => [] as CompetitionDocument[]),
    opts?.uid
      ? getMyCompetitions(opts.uid).catch(() => [] as CompetitionDocument[])
      : Promise.resolve([] as CompetitionDocument[]),
  ])

  const docById = new Map<string, CompetitionDocument>()
  for (const d of publicDocs) docById.set(d.competitionId, d)
  for (const d of myDocs) {
    docById.set(d.competitionId, d)
    ids.add(d.competitionId)
  }

  const gwNameByCompetitionId = new Map<string, string>()
  for (const gw of allGameweeks) {
    const id = competitionIdForGameweek(gw)
    gwNameByCompetitionId.set(id, gw.name)
  }

  const labelForId = (id: string): string => {
    const doc = docById.get(id)
    if (doc) return resolveCompetitionDisplayName(doc, locale)
    if (id === DEFAULT_FLAGSHIP_ID) return 'Banger World'
    return gwNameByCompetitionId.get(id) || id
  }

  const options = [...ids].map((id) => ({ id, label: labelForId(id) }))
  return sortRankingsCompetitionOptions(options)
}