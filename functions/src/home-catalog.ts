import * as admin from 'firebase-admin'

const DEFAULT_FLAGSHIP_ID = 'banger-world'

export const HOME_PLAY_CATALOG_PATH = 'catalog/homePlay'
export const HOME_PLAY_CATALOG_VERSION = 1

export type SlimGameweekCard = {
  gameweekId: string
  name: string
  playerCount: number
  status: string
  deadlineMs: number | null
  startDateMs: number | null
  endDateMs: number | null
  forceOpenForTesting?: boolean
  type?: string
  description?: string
  weekNumber?: number
}

export type HomePlayCard = {
  competitionId: string
  competition: Record<string, unknown>
  gameweekId: string
  playerCount: number
  gameweek: SlimGameweekCard
}

function timestampMs(value: unknown): number | null {
  if (value && typeof (value as admin.firestore.Timestamp).toMillis === 'function') {
    return (value as admin.firestore.Timestamp).toMillis()
  }
  return null
}

function resolveDeadlineMs(gw: FirebaseFirestore.DocumentData): number | null {
  const lock = gw.lockAt ?? gw.deadline
  return timestampMs(lock)
}

function mapDashboardStatus(gw: FirebaseFirestore.DocumentData): string {
  const status = gw.status as string
  if (status === 'completed' || status === 'archived') return 'COMPLETED'
  if (status === 'active') return 'OPEN'
  return 'UPCOMING'
}

function slimGameweekFromDoc(gwId: string, gw: FirebaseFirestore.DocumentData): SlimGameweekCard {
  const playerCount =
    typeof gw.playerCount === 'number' && Number.isFinite(gw.playerCount) ? gw.playerCount : 0
  return {
    gameweekId: gwId,
    name: (gw.name as string) || gwId,
    playerCount,
    status: mapDashboardStatus(gw),
    deadlineMs: resolveDeadlineMs(gw),
    startDateMs: timestampMs(gw.startDate),
    endDateMs: timestampMs(gw.endDate),
    forceOpenForTesting: gw.forceOpenForTesting === true,
    type: gw.type as string | undefined,
    description: gw.description as string | undefined,
    weekNumber: typeof gw.weekNumber === 'number' ? gw.weekNumber : undefined,
  }
}

function competitionIdForGameweek(gw: FirebaseFirestore.DocumentData, gwId: string): string {
  if (typeof gw.competitionId === 'string' && gw.competitionId.trim()) {
    return gw.competitionId.trim()
  }
  if (gw.type === 'league' || gw.type === 'cup') {
    return gwId
  }
  return DEFAULT_FLAGSHIP_ID
}

function slimCompetition(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined,
  gw: FirebaseFirestore.DocumentData,
  gwId: string
): Record<string, unknown> {
  if (data) {
    return {
      competitionId: id,
      displayName: data.displayName,
      displayName_esMX: data.displayName_esMX,
      kind: data.kind,
      visibility: data.visibility,
      featured: data.featured,
      featuredRank: data.featuredRank,
      activeGameweekId: data.activeGameweekId ?? gwId,
      status: data.status,
      opensAt: data.opensAt ?? null,
      tagline: data.tagline,
      tagline_esMX: data.tagline_esMX,
      primaryLeagueId: data.primaryLeagueId,
      memberCount: data.memberCount,
    }
  }
  const kind = gw.type === 'league' ? 'league' : gw.type === 'cup' ? 'cup' : 'flagship'
  return {
    competitionId: id,
    displayName: id === DEFAULT_FLAGSHIP_ID ? 'Banger World' : (gw.name as string) || id,
    kind,
    visibility: 'public',
    featured: id === DEFAULT_FLAGSHIP_ID,
    featuredRank: id === DEFAULT_FLAGSHIP_ID ? 0 : 50,
    activeGameweekId: gwId,
    status: 'active',
  }
}

function isComingSoon(comp: Record<string, unknown>): boolean {
  const opensAt = comp.opensAt
  const opensMs = timestampMs(opensAt)
  if (opensMs == null) return false
  const activeGw = comp.activeGameweekId
  return typeof activeGw !== 'string' || !activeGw.trim()
}

/**
 * Rebuild catalog/homePlay from competitions + active gameweeks (no embedded league standings).
 */
export async function rebuildHomePlayCatalog(db: admin.firestore.Firestore): Promise<void> {
  const [compSnap, activeGwSnap, completedGwSnap] = await Promise.all([
    db.collection('competitions').where('visibility', '==', 'public').where('status', '==', 'active').limit(24).get(),
    db.collection('gameweeks').where('status', '==', 'active').get(),
    db.collection('gameweeks').where('status', '==', 'completed').limit(12).get(),
  ])

  const sortGameweeksDesc = (
    docs: FirebaseFirestore.QueryDocumentSnapshot[]
  ): FirebaseFirestore.QueryDocumentSnapshot[] =>
    [...docs].sort((a, b) => {
      const am = timestampMs(a.data().startDate) ?? 0
      const bm = timestampMs(b.data().startDate) ?? 0
      return bm - am
    })

  const gameweeksById = new Map<string, FirebaseFirestore.DocumentData>()
  for (const d of sortGameweeksDesc(activeGwSnap.docs)) {
    gameweeksById.set(d.id, d.data())
  }
  if (gameweeksById.size === 0) {
    for (const d of sortGameweeksDesc(completedGwSnap.docs)) {
      gameweeksById.set(d.id, d.data())
    }
  }

  const compById = new Map<string, FirebaseFirestore.DocumentData>()
  for (const d of compSnap.docs) {
    compById.set(d.id, d.data())
  }

  const merged = new Map<string, FirebaseFirestore.DocumentData>()
  for (const [id, data] of compById) {
    merged.set(id, data)
  }

  if (merged.size === 0) {
    for (const [gwId, gw] of gameweeksById) {
      const cid = competitionIdForGameweek(gw, gwId)
      if (!merged.has(cid)) {
        merged.set(cid, {})
      }
    }
  }

  const cards: HomePlayCard[] = []
  const comingSoon: Record<string, unknown>[] = []
  let batch = db.batch()
  let batchOps = 0

  const flushBatch = async () => {
    if (batchOps === 0) return
    await batch.commit()
    batch = db.batch()
    batchOps = 0
  }

  for (const [compId, compData] of merged) {
    let gwId =
      (typeof compData.activeGameweekId === 'string' && compData.activeGameweekId) || null
    if (!gwId) {
      for (const [id, gw] of gameweeksById) {
        if (competitionIdForGameweek(gw, id) === compId) {
          if (gw.status === 'active') {
            gwId = id
            break
          }
          gwId = gwId || id
        }
      }
    }

    const compRecord = slimCompetition(compId, compData, gameweeksById.get(gwId || '') || {}, gwId || '')

    if (!gwId || !gameweeksById.has(gwId)) {
      if (isComingSoon(compRecord)) {
        comingSoon.push(compRecord)
      }
      continue
    }

    const gw = gameweeksById.get(gwId)!
    const slim = slimGameweekFromDoc(gwId, gw)
    cards.push({
      competitionId: compId,
      competition: compRecord,
      gameweekId: gwId,
      playerCount: slim.playerCount,
      gameweek: slim,
    })

    const compRef = db.collection('competitions').doc(compId)
    batch.set(
      compRef,
      {
        playCard: {
          gameweekId: gwId,
          playerCount: slim.playerCount,
          gameweek: slim,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    )
    batchOps++
    if (batchOps >= 400) await flushBatch()
  }

  cards.sort((a, b) => {
    const fa = a.competition.featured === true ? 0 : 1
    const fb = b.competition.featured === true ? 0 : 1
    if (fa !== fb) return fa - fb
    const ra = (a.competition.featuredRank as number) ?? 999
    const rb = (b.competition.featuredRank as number) ?? 999
    return ra - rb
  })

  await flushBatch()

  const signature = cards.map((c) => `${c.competitionId}:${c.gameweekId}`).join('|')
  await db.doc(HOME_PLAY_CATALOG_PATH).set(
    {
      version: HOME_PLAY_CATALOG_VERSION,
      signature,
      cards,
      comingSoon,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}