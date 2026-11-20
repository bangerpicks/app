# Multi-competition tracks (phase 1 shipped, phase 2 planned)

## Phase 1 (client)

- **Route:** `/dashboard/` is unified Home (competitions + intro). `/competitions/` redirects to dashboard.
- **Bottom nav:** Home, Rankings, Shop (see `competition-platform.md`).
- **Rankings weekly scope:** `competition-tracks.mjs` maps `gameweek.type` → track id:
  - `banger-world` — flagship / banger-week / missing type
  - `league` — `type === 'league'`
  - `cup` — `type === 'cup'`
- **URL:** `/rankings/?track=banger-world`
- **Session cache:** `rankings-cache` v2 stores `trackId`.
- **Season / HoF:** unchanged (global flagship season); non-flagship tracks show notice.

## Phase 2 (Firestore)

### `competitions/{competitionId}`

| Field | Purpose |
|-------|---------|
| `displayName`, `displayName_esMX` | Rankings + play hub label |
| `kind` | `flagship` \| `league` \| `cup` |
| `activeSeasonId` | Per-competition season standings (optional) |
| `sortOrder` | Card / track ordering |
| `subtitle`, `icon` | Optional; else gameweek-card-branding defaults |

### `gameweeks/{id}`

- Add required `competitionId` for new slates (keep `type`, `seasonId`, `weekNumber` for compat).
- Backfill: existing flagship weeks → `competitionId: banger-world`.

### Rankings

- Track selector reads `competitions` collection instead of coarse type buckets.
- Season tab loads `seasonStandings/{activeSeasonId}` when track defines one.

### Functions

- `recomputeSeasonStandings` only includes gameweeks whose `competitionId` belongs to that season (generalize flagship gating in `gameweek-utils.ts`).

### Security rules

- `competitions/*`: public read, admin write.

### Admin

- Gameweek form: competition picker; create competition wizard (later).