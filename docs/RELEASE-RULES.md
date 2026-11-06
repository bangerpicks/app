# Firestore and Storage rules rollout

Do these steps in order. Do not deploy the rules before the migrations have been applied, and do not unfreeze the shop before the new rules are live.

The new rules reject a redemption when `users.pointsSpent` is missing. Until the backfill runs, the shop cannot take new redemptions. Freezing it first makes that obvious instead of a surprise permission error.

Cancelling a redemption does not decrease `pointsSpent`. After this rollout, refunds are an admin edit of that field (`pointsSpent` minus the cancelled cost, and never below the sum of the redemptions that are still not cancelled). A Cloud Function for that refund is not in this release.

## 1. Freeze the shop

In the Firebase console, or with the Admin SDK, set `settings/app.shopEnabled` to `false`.

Confirm the shop UI refuses new redemptions. Leave the flag false until step 6.

## 2. Dry-run the migrations

These commands only print a diff. They do not write.

```bash
node scripts/migrate-points-spent.js --project banger-picks
node scripts/migrate-shop-options-by-id.js --project banger-picks
node scripts/migrate-player-counts.js --project banger-picks
```

Read every `CHANGE` and `ORPHAN` line.

- `pointsSpent` is `max(existing, computed)` and is never lowered. Computed spend ignores `cancelled` redemptions. Users with no document are skipped, not created.
- `optionsById` is rebuilt from `playerOptions` and rewritten when any value differs.
- `playerCount` on `predictions/{fixtureId}` is the entry count. `playerCount` on `gameweeks/{id}` is the number of distinct entrants. Neither count is lowered.

A run without `FIRESTORE_EMULATOR_HOST` and without `--project banger-picks` exits before it reads data.

## 3. Apply the migrations

```bash
node scripts/migrate-points-spent.js --apply --project banger-picks
node scripts/migrate-shop-options-by-id.js --apply --project banger-picks
node scripts/migrate-player-counts.js --apply --project banger-picks
```

Then dry-run again. The second dry-run should report no `CHANGE` lines. Orphans, if any, stay listed until those user ids are fixed by hand.

## 4. Deploy rules, indexes, and Storage

Enable the Storage service agent permission in the Firebase console first. `storage.rules` reads Firestore for `isAdmin()`, and that cross-service check fails closed without the permission.

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## 5. Verify

- A user whose `pointsSpent` was missing before step 3 now has the field, including `0`.
- A signed-out dashboard shows the gameweek player count from `gameweeks/{id}.playerCount`, not `0`.
- Saving a pick still works on an active gameweek before the deadline, and a second save does not increase the count.
- The shop is still frozen.

## 6. Unfreeze the shop

Set `settings/app.shopEnabled` back to `true`.

Place one test redemption and confirm `pointsSpent` increased by that item's cost and, for a stock-tracked item, `stock` dropped by 1 with `lastRedemptionId` set to that redemption.
