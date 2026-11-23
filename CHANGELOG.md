# Changelog

## 1.2.9 — 2026-11-23

### Ops & performance follow-ups

- Admin callable `adminRunBackfills` and Settings panel (slim fixtures, displayNames, crowd counters, standings meta migration).
- Shared fixtures listener pool, React Query provider, standings in `gameweeks/{id}/meta/standings`.
- PWA: service worker, PNG icons, stricter lint (`--max-warnings 0`), dynamic auth/modal chunks.

## 1.2.8 — 2026-11-23

### Feature: Coming Soon competition card

- Competition docs accept optional `opensAt`, `tagline`, and `tagline_esMX`.
- Active public competitions with no `activeGameweekId` but an `opensAt` show a Coming Soon card on Home and Discover.

### Fix: Score picks on the 90-minute result

- Knockout matches (AET/PEN) use `score.fulltime` for H/D/A scoring; extra time and penalties no longer change the outcome.
- Prediction entries store the 90-minute score as `result` when awarded.

## 1.2.6 — 2026-11-16

### Fix: Rankings QA hang hook respects LoadBudget

- `rankingsHungReadGate` races simulated hangs against `budget.remaining()` so timeouts surface Try again within the 32s budget.
- Hang simulation is disabled in production bundles unless `NEXT_PUBLIC_RANKINGS_QA_HANG=true`; dev may also use `?qa=1`.

## 1.2.3 — 2026-11-16

### Fix: Rankings load reliability (Option B)

- This Week and Season load independently on a shared 32s `LoadBudget` with server-first Firestore reads, stale banner, and Try again (en + es-MX).
- Distinct loaded / empty / error states: silent timeouts and empty cache no longer masquerade as “no rankings”; season spinner always clears.
- Session cache stores only successful server loads; refetch on resume after failure or ~2 min stale.
- QA hook: set `window.__BANGER_RANKINGS_SIMULATE_HANG__` to `fixtures`, `entries`, `users`, `weeklyStandings`, `seasonStandings`, or `activeSeason` to hang a read.

## 1.1.12 — 2026-11-16

### Fix: stale “Players Joined” after first save

- After a successful first join, bump the gameweek card count locally and patch the dashboard session cache so reloads within the TTL stay correct.
- Fresh server loads still overwrite session cache; refetch player count only when the gameweek doc has no numeric `playerCount`.
- `readGameweekPlayerCount` uses server-first reads; never downgrade an in-memory count with a cache-served lower value.

### Fix: prediction save latency (~25s)

- Skip redundant `ensureUserDocument` merge writes when the profile is already valid.
- Load prediction entry docs once in parallel and reuse snapshots in the write loop.
- On follow-up saves, write only fixtures whose pick changed (first join still writes the full slate). Gameweek `playerCount` increment unchanged (once per user per gameweek on cache create).

## 1.1.11 — 2026-11-15

### Fix: dashboard gameweek load timeouts on mobile

- Firestore reads for gameweek lists and fixture subcollections use longer per-attempt timeouts with exponential backoff (automatic retry) instead of a single 10s race.
- `fetchCurrentGameweek` stops firing three parallel full gameweek list queries on every dashboard visit; it resolves active → completed → fallback sequentially.
- Firestore client: persistent local cache (multi-tab manager) and `experimentalAutoDetectLongPolling` for iOS Safari / slow mobile links.
- Dashboard gameweek/fixture reads are **server-first** (`getDocsFromServer`); empty cache fallback is an error; non-empty cache fallback returns data with stale banner; only confirmed server-empty means “no week”.
- Shared **32s** load budget caps total dashboard fetch time; session cache keyed by uid + locale with 10-minute TTL; cleared on sign-out.
- Stale banner driven by Firestore `fromCache` / refresh-failure signals.
- App version label 1.1.11.

## 1.1.10 — 2026-11-15

### Fix: mobile bottom nav jumping to top of viewport

- Pin the dashboard bottom tab bar with `position: fixed` to the visual viewport instead of `position: sticky` + `bottom-0` inside the page flex column.
- Stop applying the iOS sticky `translateZ(0)` hack to the bottom nav (it created a new containing block and made sticky-bottom unreliable when the Safari address bar resized or when live dashboard updates reflowed the page).
- App version label 1.1.10.

## 1.1.9 — 2026-11-13

### i18n: last-5 form result letters (es-MX)

- Match cards: translate form pills at display time (en W/D/L; es-MX G/E/P) with localized aria-label and title.
- App version label 1.1.9.

## 1.1.8 — 2026-11-12

### Hosting: revalidate clean URL HTML routes

- Firebase Hosting headers: catch-all `**` sets `Cache-Control: no-cache, max-age=0, must-revalidate` so extensionless routes (`/profile/`, `/dashboard/`, etc.) revalidate after deploy; hashed JS/CSS/images keep `public, max-age=31536000, immutable` via the later matching rule (last match wins).
- App version label 1.1.8.

## 1.1.7 — 2026-11-12

### P0: first gameweek join save (rules eval order + chunking)

- Firestore allow rules: evaluate player save path before `isAdmin()` so boolean `||` short-circuits and does not burn exists/get budget on every write in a batch (per-op 10, batch 20 caps).
- Client `savePredictions`: join batch max 1 fixture; follow-up batches max 2.
- App version label 1.1.7.

## 1.1.6 — 2026-11-12

### Dashboard polish (i18n, match cards, hosting)

- Match cards: fixture **match context** (why-it-matters) separate from a combined **market odds + players' picks** disclosure; hiding odds hides both; no official Gaffer lean on player cards.
- Players' picks show **pick counts** per outcome (not percentages); market bar still uses implied percentages.
- Settings: on-load toggles describe match context vs combined odds/players picks (en + es-MX).
- es-MX fixes: gameweek OPEN, Last 5, league position; hide missing ranks and empty form; no English ordinals in Spanish.
- Bottom nav scroll padding; why-it-matters clamped to 2 lines.
- Firebase Hosting: immutable cache for hashed assets; HTML revalidates immediately.
- App version label 1.1.6.

## 1.1.5 — 2026-11-11

### Match cards: Gaffer preview and localized context

- Optional `officialPick` and `officialConfidence` on fixture docs; shown on match cards as a labeled house preview (distinct from player H/D/A buttons).
- Optional `whyItMatters_esMX`; dashboard uses Spanish copy when locale is `es-MX`, with English fallback.
- Admin gameweek form: editorial fields per fixture (why-it-matters EN/ES, official pick, confidence).
- Match card dates/times and kickoff formatting follow active locale (`en-US` / `es-MX`); LIVE / HT / FT labels translated.
- First sign-in: unset `users.language` inherits browser language and persists it (saved `en` / `es-MX` still wins).
- Project i18n rules: `docs/I18N.md`.

## 1.1.3 — 2026-11-11

### Gameweek integrity (dashboard, admin, functions)

- Removed production mock fixtures; empty, loading, and error states instead.
- Dashboard shows stored `playerCount` immediately; background refresh does not reset to zero.
- Single active flagship week enforced on admin writes and Cloud Functions (`onGameweekCreate` / `onGameweekUpdate`).
- Podium bonuses only on `active` → `completed`, guarded by `podiumAwardedAt`; admin confirm before completing. Payout applies user increments and `podiumAwardedAt` in a single Firestore transaction so retries cannot double-pay.
- Pick lock defaults to 1 hour before first kickoff; editable lock time in admin form.
- Shared current-week selection for dashboard and rankings; optional schema fields (`type`, `lockAt`, `whyItMatters`, etc.).

## 1.1.1 — 2026-11-11

### P0-2: Scheduled functions API quota and 429 handling

- `updateLiveFixtures` and `autoScoring` call API-Football only when fixtures are in the live/scoring window or need stale-status recovery; idle ticks make zero API calls.
- Fixture lookups are batched (`ids=` up to 20 per request). HTTP 429 is logged once and skips the rest of the tick without failing the scheduler.
- Live updater schedule relaxed to every 2 minutes (was 1 minute).

### P0-3: Remove API-Football key from the client bundle

- Admin fixture/player search uses the `adminApiFootball` callable; the browser no longer reads `NEXT_PUBLIC_API_FOOTBALL_KEY`.
- Cloud Functions load the key from Secret Manager via `defineSecret('API_FOOTBALL_KEY')` (with emulator/local `API_FOOTBALL_KEY` fallback).

**Deploy (Martin):** `firebase functions:secrets:set API_FOOTBALL_KEY`, deploy functions, deploy hosting. Rotate the previous key at API-Football — it was exposed in the public bundle.

## 1.1.0 — 2026-11-06

First production release of Banger Picks rules and the client that can satisfy them.

- Default-deny Firestore rules: pick deadline and fixture lock, shop balance via `pointsSpent`, stock tied to one redemption, maintenance mode, and public player counts.
- Hosting and rules deploy together. The profile page shows the release version, short commit, and build date.
- Read-only Firestore backup and idempotent migrations for `pointsSpent`, favorite-player prices, and player counts.

Signed-in users can still read every profile and every pick. Cancelling a redemption does not refund `pointsSpent`.
