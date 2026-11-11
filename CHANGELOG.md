# Changelog

## 1.1.5 — 2026-11-11

### Match cards: Gaffer preview and localized context

- Optional `officialPick` and `officialConfidence` on fixture docs; shown on match cards as a labeled house preview (distinct from player H/D/A buttons).
- Optional `whyItMatters_esMX`; dashboard uses Spanish copy when locale is `es-MX`, with English fallback.
- Admin gameweek form: editorial fields per fixture (why-it-matters EN/ES, official pick, confidence).

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
