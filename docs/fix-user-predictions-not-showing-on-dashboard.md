# Fix: User Selected Predictions Not Showing on Dashboard

This document describes the issue where a user’s saved predictions (H/D/A picks) did not appear on the dashboard after selection, and how it was fixed.

## Problem

- Users could select predictions (Home / Draw / Away) and save them.
- After save or on later visits, those selections did not show on the dashboard match cards.
- The UI did not reflect the user’s stored predictions.

## Root Causes

Two main causes were involved:

### 1. Predictions loaded after fixtures (async timing)

On the dashboard page:

1. The active gameweek and fixtures are loaded first.
2. Match list state is set with **no** `userPrediction` on each match.
3. User predictions are loaded from Firestore **in a separate async step** (only when the user is authenticated).

So the first render (and the data passed into the live-matches hook) had matches **without** `userPrediction`. When predictions finished loading, they were merged into `initialMatches`, but the downstream hook had to explicitly react to that update and re-apply predictions to the displayed matches.

### 2. Live match updates overwrote user predictions

The dashboard uses `useLiveMatches` to subscribe to Firestore for live fixture updates (scores, status, etc.). When a snapshot arrived:

- Fixture data was converted into `MatchCardData`.
- That conversion used **only** data from Firestore (fixtures), which does **not** include the current user’s predictions.
- So each update replaced the match list with new objects that had **no** `userPrediction`, effectively wiping out the user’s picks from the UI.

So even when the page had merged predictions into `initialMatches`, the next Firestore update would overwrite the displayed matches and drop predictions.

## Solution Overview

The fix had two parts:

1. **Dashboard page**: Keep loading predictions asynchronously, but merge them into the same match list state that drives the rest of the UI, so “initial matches” eventually include `userPrediction` for each match.
2. **useLiveMatches**: Treat user predictions as separate from fixture data: store them in a ref derived from `initialMatches`, and always re-apply them when building the match list (both when `initialMatches` changes and when applying Firestore snapshot updates).

## Changes Made

### 1. Dashboard page (`app/dashboard/page.tsx`)

- After fixtures are converted and set into state, the page fetches user predictions (when `user` is set) using `getUserPredictions(user.uid, fixtureIds)`.
- Predictions are merged into the existing match list via a **functional state update** so the update is based on the latest matches and does not depend on a stale closure:

```ts
setInitialMatches((prevMatches) =>
  prevMatches.map((match) => ({
    ...match,
    userPrediction: predictions.get(match.fixtureId) ?? null,
  }))
)
```

- That updated `initialMatches` is what gets memoized as `baseMatches` and passed into `useLiveMatches(gameweekId, baseMatches)`. So when predictions finish loading, `initialMatches` (and thus `baseMatches`) gain `userPrediction` per match.

### 2. useLiveMatches hook (`app/src/lib/useLiveMatches.ts`)

The hook was updated so that:

- **User predictions are stored in a ref** (`userPredictionsRef`) and kept in sync with `initialMatches`:
  - When `initialMatches` changes, an effect runs that repopulates `userPredictionsRef` from each match’s `userPrediction`.
  - The same ref is repopulated when setting up the Firestore listener and at the start of each snapshot callback from `initialMatchesRef.current`, so the ref always reflects the latest initial matches (including predictions).

- **When `initialMatches` (or `gameweekId`) changes**, a separate effect:
  - Updates `initialMatchesRef`, and refills `teamPositionsRef`, `teamFormsRef`, and `userPredictionsRef` from the new `initialMatches`.
  - If there is an active listener and we already have match data, it **re-builds** the current match list from the existing fixture data but re-applies positions, forms, and **user predictions** from the refs, then calls `setMatches(...)`. So when the page merges predictions into `initialMatches`, this effect runs and the displayed matches immediately get `userPrediction` set.

- **When handling a Firestore snapshot**, the hook:
  - Converts fixture documents into `MatchCardData` as before.
  - For each match, sets `userPrediction` from `userPredictionsRef.current.get(match.fixtureId)` (and `null` if missing), so live updates never strip the user’s picks.

- **Comparison for “did matches change?”** (`matchesChanged`) was updated to include `userPrediction`, so when the only change is predictions, the hook still updates the displayed list.

Together, this ensures:

1. When predictions load late, they are merged into `initialMatches` and then applied to the displayed matches by the effect that runs on `initialMatches` / `gameweekId`.
2. When Firestore sends live fixture updates, the converted matches are always merged with the current user predictions from the ref, so selections keep showing.

## Data flow (after fix)

1. Page loads gameweek and fixtures → sets `initialMatches` (no predictions yet).
2. Page passes `baseMatches` (from `initialMatches`) to `useLiveMatches(gameweekId, baseMatches)`.
3. `useLiveMatches` initializes refs from `initialMatches` and sets up the Firestore listener. Displayed matches may not have predictions yet.
4. Page fetches `getUserPredictions(...)` and merges into `initialMatches` via the functional `setInitialMatches` update.
5. `initialMatches` (and `baseMatches`) now have `userPrediction` per match. The effect in `useLiveMatches` that depends on `initialMatches` runs, updates `userPredictionsRef`, re-builds the current matches with predictions from the ref, and calls `setMatches`. The UI now shows the user’s selections.
6. On each Firestore snapshot, the hook converts fixtures to matches and sets `userPrediction` from `userPredictionsRef` for each match, so live updates never remove the user’s picks.

## Files touched

- `app/src/app/dashboard/page.tsx` – Load user predictions and merge into `initialMatches`.
- `app/src/lib/useLiveMatches.ts` – Store and re-apply user predictions from a ref; merge predictions when applying Firestore snapshot updates; include `userPrediction` in change detection.

## Verification

- Save predictions for one or more fixtures, then refresh the dashboard: selections should still appear on the correct match cards.
- When Firestore sends live fixture updates (e.g. score/status changes), the user’s predictions should remain visible and not disappear.
