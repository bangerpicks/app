# Firestore, Storage, and hosting rollout

The app has no active users, so this window can be short. Do the steps in order, in one sitting.

The rules require `gameweekId` and `playerCount` on every pick. The client that is hosted today does not send those fields. Deploy the new hosting build and the rules together. Deploying rules alone makes every current pick save fail.

`firebase.json` publishes the Next.js static export from `out` (`output: 'export'` in `next.config.js`). The hosting `predeploy` hook runs `npm run build` again, which is the same command as the check below.

Cancelling a redemption does not decrease `pointsSpent`. Refunds are an admin edit of that field for now: subtract the cancelled cost, and do not go below the sum of redemptions that are still not cancelled.

## 1. Turn maintenance on

In the Firebase console, set `settings/app`:

- `maintenance`: `true`
- `shopEnabled`: `false`

The rules that enforce `maintenance` are not live yet. With nobody using the app, leave the flag on through the deploy. The moment the new rules publish, they reject pick and redemption writes from non-admins. Admins can still write. Count and spend migrations in the next steps run while that freeze is the intent, before anyone can pick again.

## 2. Back up Firestore

Read-only. This does not change the database.

```bash
node scripts/backup-firestore.js --project banger-picks --out backups/firestore-pre-rules.json
```

The file contains `users`, `redemptions`, `shopItems`, `settings`, `predictions` with `entries`, and `gameweeks` with `fixtures`. Keep it outside git (`/backups/` is ignored).

Rollback warning: restoring that JSON over the project replaces documents with the backup copies. Do not restore it after new picks or redemptions exist unless you intend to discard those writes. Rolling back the release means deploying the previous hosting build and the previous rules together. The old client cannot satisfy these rules, and this client depends on `pointsSpent` and `playerCount` being present.

## 3. Dry-run the migrations

Prints a diff. Writes nothing. Do this while maintenance is on so counts and spend are not moving.

```bash
node scripts/migrate-points-spent.js --project banger-picks
node scripts/migrate-shop-options-by-id.js --project banger-picks
node scripts/migrate-player-counts.js --project banger-picks
```

- `pointsSpent` is `max(existing, computed)` and is never lowered. String costs such as `'40'` are coerced with `Number()`. Non-integers are rounded, with a `WARNING` line. Invalid costs and redemptions whose user document does not exist are `SKIP` / `ORPHAN` lines. The process exits non-zero unless you pass `--allow-skips`, and `--apply` will not write in that case.
- `optionsById` is rebuilt from `playerOptions` and rewritten when any value differs.
- `playerCount` on `predictions/{fixtureId}` is the entry count. `playerCount` on `gameweeks/{id}` is the number of distinct entrants. Neither count is lowered. A later pick cannot inflate the gameweek total by writing only the user's cache document; the increment requires a new `predictions/{fixtureId}/entries/{uid}` in the same batch.

A run without `FIRESTORE_EMULATOR_HOST` and without `--project banger-picks` exits before it reads data.

## 4. Apply the migrations

```bash
node scripts/migrate-points-spent.js --apply --project banger-picks
node scripts/migrate-shop-options-by-id.js --apply --project banger-picks
node scripts/migrate-player-counts.js --apply --project banger-picks
```

Dry-run again. There should be no `CHANGE` lines. Fix any `SKIP` or `ORPHAN` lines before deploying. Every existing user needs an integer `pointsSpent` (including `0`). Every gameweek and prediction parent that should accept new picks needs an integer `playerCount`.

## 5. Build, then deploy hosting and rules together

Confirm the static export succeeds and that `out/` is produced:

```bash
npm run build
```

Then publish the new client and the rules in one deploy:

```bash
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage
```

Hosting `predeploy` runs `npm run build` again before it uploads `out/`.

Enable the Storage service agent permission in the Firebase console before this. `storage.rules` reads Firestore for `isAdmin()`, and that cross-service check fails closed without the permission.

## 6. Verify, still in maintenance

- A signed-out dashboard shows `gameweeks/{id}.playerCount`, not `0`.
- A non-admin pick and a non-admin redemption are denied while `maintenance` is true.
- `pointsSpent` exists and is an integer on existing users.
- Saving the same pick again does not increase `playerCount`.

## 7. Turn maintenance off

Set `settings/app.maintenance` to `false` and `shopEnabled` to `true`.

Place one test redemption. `pointsSpent` increases by that item's cost. For a stock-tracked item, `stock` drops by 1 and `lastRedemptionId` is that redemption.

## Phase 1, still open

- Any signed-in user can read every profile and every prediction entry. Rankings and referral lookup need those queries, and rules cannot hide fields. That includes `isAdmin`, `pointsSpent`, and `referralPoints` on other people. Anonymous clients cannot read user documents or entries. `adminUids` stay admin-only.
- An admin cancel does not refund `pointsSpent`.
- Scoring, week bonuses, referral grants, and live fixture status still belong to the Cloud Functions. The finished-match lock only sees the status already stored on the fixture.
- Rollback is hosting plus rules together, plus the JSON backup from step 2 if you need the previous documents. Do not restore that backup on top of newer writes without meaning to delete them.
