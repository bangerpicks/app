# Rankings load reliability (v1.2.2, master 1601651)

Status: investigation only (no code, deploy, or Firestore writes). Author: executor for Skipper, Nov 16 2026, 11:05 AM CT.
Trigger: Martin's iPhone reports on Nov 16 (thegoat, EN):
- (a) `martin-rankings-noload-thisweek-2026-11-16.png`, 10:58 AM CT: This Week shows only the tabs and "No rankings available yet".
- (b) `martin-rankings-noload-season-2026-11-16.png`, 10:58 AM CT: Season is stuck on "Loading season standings...".
- (c) `martin-rankings-w2-3players-empty-2026-11-16.png`, 11:00 AM CT: the Banger Week 2 banner shows "3 players" and the arrows, but the body says "No one has saved picks for this week yet."

## 0. Live data is fine (Admin SDK, read-only, Nov 16 ~11:03 AM CT)

| doc | value |
|---|---|
| Banger Week 1 (`gw-1794436514486-…`) | completed, playerCount 10, 10 fixture docs, 10 entries on every fixture, weeklyStandings 10 rows |
| Banger Week 2 (`gw-1794782746145-…`) | active, playerCount 3, 10 fixture docs, 3 entries on every fixture, weeklyStandings doc exists with **0** rows |
| seasons/season-1 | active, 2 gameweekIds |
| seasonStandings/season-1 | 10 rows |

All three screens are therefore **client-side read failures that the UI presents as "empty" or "loading"**. They are not data problems. (The SA went to a mode-600 temp file with an EXIT trap, and no `/tmp/fb-*/sa.json` was left.)

## 1. Root causes, ranked

Key fact: the v1.1.11 (PR #15) reliability work (server-first reads, LoadBudget, empty-fallback-throws, and Try again) was applied only to the Dashboard. The Rankings page was not touched by PR #15. Its only benefit is that `getCurrentGameweek()` → `fetchCurrentGameweek()` builds its own 32s server-preferring budget. Every other Rankings read is a plain cache-or-server `getDocs`/`getDoc`, and **every loader swallows errors into `[]`, `null`, or an empty Map**. The page then renders those values as "no data" (`git log -- src/app/rankings/page.tsx`: last touched by #17/#19/#20).

On iOS Safari, Firestore's WebChannel stream is often dead for a while after the app is resumed from the background or the network changes. While it is dead, `getDocs()` waits for the SDK's online-state tracker to give up (about 10s) and then serves from the IndexedDB cache. So these reads either hit our 10s `withTimeout` (an error, which gets swallowed) or come back with an empty cache result: other players' `predictions/*/entries` are never in this device's cache. That explains why it's intermittent, why it's worse on the phone, and why Ref's fresh desktop/390px session passed.

### RC1 (most likely; produces (a) **and** (b) together): a fixtures read failure is treated as "no fixtures", and the early return never clears seasonLoading
- `src/lib/rankings.ts:57-63`: `getGameweekFixtureDetails` uses plain `getDocs` with a 10s `withTimeout`. At `:119-121`, any error or timeout gives `return []`. At `:65-66`, an empty cache-served snapshot also gives `[]`.
- `src/app/rankings/page.tsx:152-165`: `fixtures.length === 0` clears all weekly state (`currentGameweekData`, `gameweekData`, `weeklyRankings` → `undefined`) and then **`return`s before the season block**. `setSeasonLoading(false)` (`:195`) never runs, and the `finally` (`:210-214`) only resets `rankingsLoading`/`weeklyLoading`.
- Render: `RankingsClient.tsx:384-388`, with `!weeklyLoading && !gameweekData && !weeklyRankings`, gives **"No rankings available yet"** with no banner and no arrows. The "Rankings" header is only rendered for Season/HoF (`:238`), so that part is by design. This is **screenshot (a)**.
- Same session: `seasonLoading` is still `true` from its initial state (`page.tsx:53`), so `RankingsClient.tsx:394-395` shows **"Loading season standings..." forever**. This is **screenshot (b)**. Both screenshots are 10:58 AM CT with the same battery level, which fits one failed load.
- The page never re-fetches. The effect deps are `[user, locale]` (`page.tsx:237`), so tab switches don't reload, and the only way out is to leave the page and come back.

### RC2: any throw after the weekly data was set wipes it and also leaves season loading
- In the `catch` at `page.tsx:196-209`, the weekly state is cleared to `undefined` (same render as (a)) and `seasonLoading` is never set to false (same as (b)). Today most loaders swallow their own errors, so this path is rarer. `transformGameweekData` → `getGameweekPlayerCount` can still throw. That only happens when the gameweek doc lacks `playerCount`, which is not the case on live.

### RC3 (produces (c)): a failed or timed-out picks read is treated as "zero cards"
- The banner and "3 players" come from `transformGameweekData` using the stored `gameweek.playerCount` (`rankings.ts:142-145`), with **no entry reads**. So the header renders correctly even when the picks reads fail.
- `getWeeklyRankings` (`rankings.ts:321+`):
  - `getGameweekById` throws, and the catch at `:501-503` returns `[]`.
  - Each fixture's `getPredictionsForFixture` (`:180-227`) uses plain `getDocs` with a 10s timeout, and its catch (`:223-226`) returns an empty `Map`. If all 10 reads fail or time out, or are served from a cache that has no other players' entries, the result is `[]`.
  - The fan-out is 10 entries `getDocs`, plus a second `getGameweekById`, plus a second fixtures `getDocs`, plus 1 `getDoc` per player, all fired at once alongside `transformGameweekData` and `getPrecomputedWeeklyRankings`. This is the part most likely to blow the 10s budget on a weak or just-resumed mobile connection.
- `getPrecomputedWeeklyRankings` for W2 returns `[]` (doc exists with 0 rows), and `mergeWeeklyRankingsWithStandings([], [])` returns `[]` (`weekly-rankings-merge.mjs:28-31`). The merge itself does **not** drop rows. This was checked: live rows are always kept.
- Render: `RankingsClient.tsx:369-375` → `shouldShowWeeklyStandingsEmpty` (`weekly-rankings-merge.mjs:107-110`) is true for any empty array, so **"No one has saved picks for this week yet."** shows. This is **screenshot (c)**.
- A partial failure is worse and silent: if 4 of 10 entry reads fail, players show with missing picks.
- **Cached empty reuse:** the PR #15 session cache (`dashboard-cache.ts`) is **not** used by Rankings, so nothing persists an empty result across reloads. Within one page lifetime, though, the empty `currentWeeklyRankings` is kept in state and **reused** whenever the user arrows back to the current week (`page.tsx:291-304`). The past-week effect (`:240-244`) skips refetching the current week. So (c) sticks until the user leaves the page. The Firestore IndexedDB cache can also hand back an "empty" snapshot (RC3 cache path), but that's a per-read effect, not a stored result.

### RC4: reads with no timeout can hang forever
- `seasons.ts:124` `getPrecomputedWeeklyRankings` and `seasons.ts:144` `getSeasonRankings` call bare `getDoc` with **no timeout**.
  - If the first hangs, `Promise.all` at `page.tsx:168` never settles, and the full-page "Loading..." spinner stays forever (`page.tsx:307-313`).
  - If the second hangs, Season shows "Loading season standings..." forever even when This Week is fine. This is an alternate cause of (b).
- `getSeasonById` (`seasons.ts:80`) also has no timeout, but Rankings doesn't use it.
- `getActiveSeason` swallows errors into `null` (`seasons.ts:72-75`), and the page then shows "No season standings" instead of an error.

### RC5: errors are never shown
- `weeklyError` is set (`page.tsx:88, 203, 247, 278`) but **never passed to `RankingsClient` or rendered**. There is no Try again anywhere on Rankings. Only all-time failures show the full-page error, and that has no retry button either (`page.tsx:324-333`).

### Ruled out or low likelihood
- **Auth race / permission-denied on the new collections:** the fetch effect only runs when `user` is set (`page.tsx:218`), and the full page waits for `authLoading`. A token-refresh permission-denied is possible but would hit the same swallow paths. Low likelihood.
- **Empty `navigableWeeks` / `activeGameweek` on cold load:** if `getCurrentGameweek` returns `null` (`rankings.ts:34-39` swallows), This Week would show (a), but Season would still finish loading, which doesn't fit (b) in the same session. It is possible separately and is fixed by the same plan.
- **Wrong effect deps on tab switch:** tabs are pure client state. Data loads once per mount, which is a missing-retry problem (RC1/RC5), not a stale closure.
- **persistentLocalCache + multi-tab on iOS (`firebase.ts:49-53`):** this contributes because it's why reads can come back from an empty cache or stall on the IndexedDB lease. The Dashboard already copes with it through server-first reads, so changing the cache config is not needed for the fix.

## 2. Fix plan

### Option A: minimal hotfix (v1.2.3, about 2-3 h)
1. `page.tsx`: move `setSeasonLoading(false)` into the `finally`, so it always clears. Load the season **independently** of the weekly chain (its own promise) so a weekly failure can't block it.
2. Make loaders that fail **throw**, not return empty:
   - `getGameweekFixtureDetails` throws on error.
   - `getPredictionsForFixture` throws on error.
   - `getWeeklyRankings` lets errors propagate.
   - `getSeasonRankings` and `getPrecomputedWeeklyRankings` throw on error and get a `withTimeout` (8-10s).
   - The only callers are `rankings/page.tsx` and `getWeeklyRankings` itself, so no other page is affected.
3. Render `weeklyError` and a new `seasonError` in `RankingsClient` as "Couldn't load rankings" with a **Try again** button, in en and es-MX. Try again re-runs the load. Use a `reloadKey` in the effect deps.
4. Show "No one has saved picks…" only when the picks reads **succeeded** and returned 0 rows. Show "No rankings available yet" only when `getCurrentGameweek` really returned no week, not on error.
- Pros: small diff that fixes all three screens' misleading states. Cons: reads stay cache-first, so failures will still happen on resume; they'll just be honest and retryable.

### Option B (recommended): Option A plus bringing Rankings onto the PR #15 machinery (v1.2.3, about 1 day)
- Everything in A, plus:
  - One `LoadBudget` (32s) per Rankings load, shared by all reads.
  - Use `getQuerySnapshotServerPreferring` / the doc equivalent in `firestore-server-read.ts` for: fixtures, the 10 entries queries, the user docs, weeklyStandings, the season, and seasonStandings. Server first with 8s attempts and retries. A non-empty cache fallback shows data with the existing stale banner. An empty fallback throws, which shows Try again. This is exactly the Dashboard contract.
  - Treat partial entry failures as an error, or retry them, instead of silently dropping picks.
  - Cut the fan-out:
    - pass the already-loaded gameweek and fixtures into `getWeeklyRankings`, removing the duplicate `getGameweekById` and fixtures reads;
    - for **completed** weeks, render from `weeklyStandings` alone plus the entries reads only for picks (the 10 user `getDoc`s are redundant, since standings carry the name and photo);
    - cap concurrency at about 4.
  - Re-run the load on `visibilitychange` → visible if the last load failed or is older than 10 min. iOS resume is the trigger.
- Pros: matches Dashboard behavior, which Ref already knows how to test, and stops most failures instead of only reporting them. Cons: bigger diff in the read path, so the full Ref matrix is needed.

### Option C: precomputed-only Rankings (larger, later)
- A Cloud Function maintains a `weeklyStandings`-style doc **with picks embedded** for the active week, updated on entry write (or a callable). Rankings becomes 2-3 doc reads: gameweek, weeklyStandings, seasonStandings.
- This is the most robust and cheapest option, but it needs new function and trigger code, a deploy of functions, and a check of whether embedding picks before kickoff is OK product-wise. Martin asked that picks be visible pre-kickoff, so yes. Effort is about 2 days, and it touches functions, so it's higher risk.

**Recommendation: Option B** as v1.2.3. If time is short, ship A first (same day) and B right after. Keep C on the backlog for when the player count grows.

## 3. Test plan for Ref

Repro (on master 1601651, to confirm the bug before the fix):
1. Emulator seed matching live (W1 completed 10 players with weeklyStandings; W2 active with 3 savers and a 0-row weeklyStandings; season-1 active).
2. Use a dev-only fault injector, or DevTools request blocking on `firestore.googleapis.com` / `Listen/channel` URLs after the page shell loads. Alternatively, set the emulator to hang via a network-throttle profile at 0 kbps for 12s.
   - Block during the fixtures `getDocs`. Expect: This Week "No rankings available yet" **and** Season stuck on "Loading season standings..." → (a) + (b).
   - Allow fixtures and block `predictions/*/entries`. Expect: W2 banner "3 players" + "No one has saved picks for this week yet." → (c).
   - Block only `seasonStandings/season-1`. Expect: Season loading forever (RC4).
3. Real iPhone: open Rankings, background Safari or the PWA for 5+ min (or toggle Wi-Fi→LTE), resume, and pull to refresh. Repeat 10×.

Verify the fix (en + es-MX, 390 and 1280, plus a real iPhone):
- Each blocked read above now shows **"Couldn't load rankings" + Try again** (es-MX copy present) within ≤32s. It never shows an empty state, an infinite "Loading", or "No rankings available yet".
- Try again with the network restored loads the full data with no page navigation needed.
- Season loads even when the weekly reads fail, and vice versa.
- True empties still work: a zero-card week shows "No one has saved picks…", and no active week shows "No rankings available yet".
- Cache fallback (Option B): go offline after one good load and reload. Data shows with the stale banner, not an error.
- Resume: background for 10+ min, return, and the page silently refreshes (B).
- Regression: W1 shows 10 rows with photos and picks (thegoat 5, eight at 4, soto92 2); W2 shows 3 savers with picks at 0 pts; the prev/next arrows work; Season shows 10 rows; HoF is unchanged; the Dashboard is unaffected.
- Read count: one W1 load issues ≤ ~25 reads (before: ~33+ with duplicates).
- Tests: unit tests for "loader error → error state, not empty", `seasonLoading` always clears, and the empty-vs-error classifier. Plus unit 69+, functions 28, test:rules 53, and build.

## 4. Risk and effort
- **A:** about 2-3 h dev plus 1 h QA. Low risk: client only, no rules or functions changes, and Hall of Fame is untouched. These loaders are only called from the Rankings page (grep confirms), so changing them to throw has no other callers to break.
- **B:** about 1 day dev plus 2 h QA. Medium risk: the read path is reworked, but it reuses proven PR #15 helpers. Read cost goes **down**. There are no rules changes, because signed-in users can already read all of these collections.
- **C:** about 2 days and a functions deploy. Medium-high risk. Defer.
- None of these need Martin's approval: no spend, no data deletion, no rules or permission changes. They're routine after Ref QA.
