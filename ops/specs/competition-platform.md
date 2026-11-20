# Competition platform (Unified Home)

## Routes

- **Home:** `/dashboard/` — intro, referral, featured + my competitions, join code, link to discover.
- **Legacy:** `/competitions/` redirects to `/dashboard/`.
- **Discover:** `/discover/` — paginated public catalog + search.
- **Join:** `/join/?code={code}` — resolve code, membership, redirect to slate.
- **Rankings:** `?competition={competitionId}` (legacy `?track=` still mapped).

## Data model

See Phase B–E in unified plan: `competitions`, `joinCodes`, `users/{uid}/competitions`, `gameweeks.competitionId`.

## Nav

Three tabs: Home, Rankings, Shop.