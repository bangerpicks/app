/**
 * Create Season 1 and backfill seasonId + standings (dry-run by default).
 *
 *   node scripts/backfill-season-1.js --dry-run --project banger-picks
 *   node scripts/backfill-season-1.js --apply --project banger-picks
 *
 * Only sets or merges fields; never deletes.
 */

const { parseMigrateArgs, assertMigrateAllowed } = require('./migrate-guard')

const SEASON_ID = 'season-1'
const GW1 = 'gw-1794436514486-aivh2f6ci'
const GW2 = 'gw-1794782746145-wehtbi6du'

function adminTimestampFromDate(date) {
  const adminSdk = require('../functions/node_modules/firebase-admin')
  return adminSdk.firestore.Timestamp.fromDate(date)
}

async function backfillSeason1({ db, apply, log = console.log }) {
  const adminSdk = require('../functions/node_modules/firebase-admin')
  const seasonRef = db.collection('seasons').doc(SEASON_ID)
  const seasonSnap = await seasonRef.get()
  const seasonPayload = {
    name: 'Season 1',
    name_esMX: 'Temporada 1',
    seasonNumber: 1,
    startAt: new Date('2026-11-13T00:00:00.000Z'),
    gameweekIds: [GW1, GW2],
    bestN: 3,
    weekCount: 6,
    status: 'active',
  }

  if (!seasonSnap.exists) {
    log(`CHANGE seasons/${SEASON_ID} create`)
    if (apply) {
      await seasonRef.set({
        ...seasonPayload,
        startAt: adminTimestampFromDate(seasonPayload.startAt),
        createdAt: adminSdk.firestore.FieldValue.serverTimestamp(),
      })
    }
  } else {
    log(`UNCHANGED seasons/${SEASON_ID} (exists; merge fields only)`)
    if (apply) {
      await seasonRef.set(
        {
          ...seasonPayload,
          startAt: adminTimestampFromDate(seasonPayload.startAt),
        },
        { merge: true }
      )
    }
  }

  for (const gwId of [GW1, GW2]) {
    const gwRef = db.collection('gameweeks').doc(gwId)
    const gwSnap = await gwRef.get()
    if (!gwSnap.exists) {
      log(`SKIP gameweeks/${gwId} missing`)
      continue
    }
    log(`CHANGE gameweeks/${gwId} seasonId=${SEASON_ID}`)
    if (apply) {
      await gwRef.set({ seasonId: SEASON_ID }, { merge: true })
    }
  }

  if (apply) {
    const {
      refreshWeeklyStandingsForGameweek,
      recomputeSeasonStandings,
    } = require('../functions/lib/standings-update')
    for (const gwId of [GW1, GW2]) {
      const gwSnap = await db.collection('gameweeks').doc(gwId).get()
      if (!gwSnap.exists) continue
      log(`BUILD weeklyStandings/${gwId}`)
      await refreshWeeklyStandingsForGameweek(db, gwId)
    }
    log(`BUILD seasonStandings/${SEASON_ID}`)
    await recomputeSeasonStandings(db, SEASON_ID)
  } else {
    log(`DRY-RUN would build weeklyStandings for ${GW1}, ${GW2} and seasonStandings/${SEASON_ID}`)
  }

  log(`${apply ? 'APPLY' : 'DRY-RUN'} backfill-season-1 complete`)
}

async function main() {
  const args = parseMigrateArgs(process.argv.slice(2))
  if (args.help) {
    console.log(
      'Usage: node scripts/backfill-season-1.js [--dry-run | --apply --project banger-picks]'
    )
    return
  }
  assertMigrateAllowed(args)
  const admin = require('../functions/node_modules/firebase-admin')
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: args.project || process.env.GCLOUD_PROJECT || 'demo-banger-picks' })
  }

  if (args.apply) {
    try {
      require('../functions/lib/standings-update')
    } catch {
      console.error('Build functions first: npm --prefix functions run build')
      process.exit(1)
    }
  }

  await backfillSeason1({ db: admin.firestore(), apply: args.apply })
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = { backfillSeason1, SEASON_ID, GW1, GW2 }