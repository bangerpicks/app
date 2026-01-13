API-FOOTBALL Integration Guide

This project integrates API-FOOTBALL directly from the browser using a domain-locked API key. We previously proxied via Firebase Functions to hide the key, but now we rely on API-SPORTS domain restrictions so the key can be safely used in JavaScript.

Overview
- Base provider: API-SPORTS (`https://v3.football.api-sports.io`)
- Only GET requests are allowed (provider policy)
- Frontend calls → `https://v3.football.api-sports.io/<endpoint>` directly from the browser
- Your API key is sent client-side in header `x-apisports-key` and is restricted by domain in the API-SPORTS dashboard

Setup
1) In your API-SPORTS dashboard, enable domain protection for your API key. Add all domains that should be allowed (production, staging, localhost for development if supported).
2) Add your key to your HTML as a meta tag on every page that calls the API:

```html
<meta name="api-sports-key" content="YOUR_REAL_KEY" />
```

3) Use the provided client in `public/js/api-football.js` as `af.get(path, params)`.

How to call endpoints
Use the lightweight client in the browser:

```javascript
import { af } from '/js/api-football.js';

// Timezone list
const tz = await af.get('/timezone');

// Leagues for season 2024
const leagues = await af.get('/leagues', { season: 2024 });

// Fixtures range (UTC dates, ISO YYYY-MM-DD)
const fixtures = await af.get('/fixtures', { from: '2025-08-15', to: '2025-08-17' });

// One fixture by id
const one = await af.get('/fixtures', { id: 215662 });

// Head-to-head (team ids joined by '-')
const h2h = await af.get('/fixtures/headtohead', { h2h: '33-34' });

// Team statistics in a league/season
const stats = await af.get('/teams/statistics', { league: 39, season: 2024, team: 33 });

// Players statistics with pagination
const p1 = await af.get('/players', { league: 39, season: 2024, page: 1 });
const p2 = await af.get('/players', { league: 39, season: 2024, page: 2 });

// In-play odds (optional filters)
const liveOdds = await af.get('/odds/live');

// Pre-match odds for a league/season
const odds = await af.get('/odds', { league: 39, season: 2024 });
```

Notes
- Path must match API-FOOTBALL endpoints (lowercase, exactly as documented).
- Query params are passed as-is. For list-style ids, use the provider’s hyphen-separated format (e.g., `ids=1-2-3`).

Existing helper usage
We also expose a small facade used by the app:

```javascript
import { getWeekendRange, fetchWeekendTop10, decideWinnerSymbol } from '/js/api.js';

const fixtures = await fetchWeekendTop10();
```

Rate limits
The API returns headers like `x-ratelimit-requests-remaining`. You can read them from the Response object if needed.

Constraints and CORS
- Only GET is allowed by API-FOOTBALL.
- CORS is enabled on `https://v3.football.api-sports.io` for browser usage.

Pagination
Some endpoints paginate results:
- GET /players (page=1.., 20 per page)
- GET /players/profiles (page=1.., 250 per page)
- GET /odds (page=1.., 10 per page)
- GET /odds/mapping (page=1.., 100 per page)

Use the `page` query param to navigate pages:

```javascript
const page3 = await af.get('/players/profiles', { page: 3 });
```

Timezone
Most time-based endpoints support `timezone`. You can also filter fixtures by `from`/`to` or `date` in `YYYY-MM-DD`.

```javascript
const london = await af.get('/fixtures', { team: 85, last: 10, timezone: 'Europe/London' });
```

Common endpoints quick reference
- Discovery: `/timezone`, `/countries`, `/leagues`, `/leagues/seasons`
- Teams: `/teams`, `/teams/statistics`, `/teams/seasons`, `/teams/countries`
- Venues: `/venues`
- Standings: `/standings`
- Fixtures: `/fixtures`, `/fixtures/rounds`, `/fixtures/headtohead`, `/fixtures/statistics`, `/fixtures/events`, `/fixtures/lineups`, `/fixtures/players`
- Players: `/players`, `/players/seasons`, `/players/profiles`, `/players/squads`, `/players/teams`, `/players/topscorers`, `/players/topassists`, `/players/topyellowcards`, `/players/topredcards`
- Misc: `/injuries`, `/predictions`, `/coachs`, `/transfers`, `/trophies`, `/sidelined`
- Odds: `/odds` (pre-match), `/odds/bookmakers`, `/odds/bets`, `/odds/mapping`, `/odds/live`, `/odds/live/bets`

Best practices
- Logos/images are free and uncounted, but rate-limited per second/minute. Cache or serve via a CDN.
- Respect provider’s recommended polling frequencies (many endpoints: daily/hourly; fixtures live: every 60s or provider guidance; live odds: up to every 5–60s).
- Handle empty 204 and timeouts 499 gracefully; retry with backoff.
- For status codes ≥400, display an actionable message; avoid hot-loop retrying on quota errors.

Error handling example
```javascript
try {
  const data = await af.get('/standings', { league: 39, season: 2024 });
  // use data.response
} catch (err) {
  console.error('API error:', err);
  // show user-friendly message
}
```

Security
- The key is visible in the browser by design; protect it by enabling domain restrictions in your API-SPORTS dashboard.
- If you cannot enumerate all domains or need stronger secrecy, revert to the Firebase proxy pattern.

Troubleshooting
- 403 with domain error: your current origin is not in the allowed domain list; update the API-SPORTS dashboard.
- 429/403: you’ve hit per-minute/day limits; throttle and/or wait.
- 499/500: temporary provider/network errors; implement retries with backoff.

If you need an endpoint not listed above, call it directly (no allowlist now). Ensure it is documented by API-FOOTBALL.
