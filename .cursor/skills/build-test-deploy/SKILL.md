---
name: build-test-deploy
description: >-
  Runs Banger Picks verify (type-check, lint, unit tests, Next.js build), fixes
  failures, then deploys to Firebase with the correct scope. Use when the user
  invokes /build-test-deploy, asks to build and deploy, release to production,
  or ship hosting/functions/rules.
---

# Build, test, deploy (Banger Picks)

## When to use

User says `/build-test-deploy`, “build and deploy”, “ship it”, or “release”.

## Verify loop (must pass before deploy)

From repo root (`c:\Banger Picks` or project root):

```bash
npm run build-test-deploy
```

That runs, in order: `type-check` → `lint` → `test:unit` → `build` (static export to `out/`).

**On any failure:**

1. Read the full error output.
2. Fix the **minimal** correct change in source.
3. Re-run `npm run build-test-deploy` until exit code 0.
4. Do not deploy until verify passes.

### Extra tests (conditional)

Run **only if** relevant files changed in this release:

| Changed paths | Command |
|---------------|---------|
| `firestore.rules`, `storage.rules`, `tests/*.mjs`, `scripts/migrate-*.js` | `npm run test:rules` (needs Java + Firebase emulators) |
| `functions/**` | `npm --prefix functions run build`, then include `functions` in deploy |

If `test:rules` fails, fix rules/tests before deploy.

## Deploy scope

Default: **hosting only** (UI/static app; `firebase.json` predeploy still runs `npm run build`).

```bash
firebase deploy --only hosting
```

Use **full** deploy when the release includes rules, indexes, functions, or storage:

```bash
firebase deploy
```

| Release contains | Deploy |
|------------------|--------|
| `src/**`, `public/**`, messages, assets only | `--only hosting` |
| `firestore.rules`, `firestore.indexes.json` | `--only firestore` or full |
| `storage.rules` | `--only storage` or full |
| `functions/**` | `--only functions` or full |
| Multiple of the above | `firebase deploy` |

Confirm active project before deploy (`firebase projects:list`, `firebase use` if needed). User must be logged in (`firebase login`).

## Agent checklist

```
- [ ] npm run build-test-deploy (green)
- [ ] test:rules if rules/tests touched
- [ ] functions build if functions touched
- [ ] Pick deploy scope (hosting vs full)
- [ ] firebase deploy
- [ ] Report hosting URL and what was deployed
```

## After deploy

- Remind: long-lived cache on JS/CSS in `firebase.json`; hard refresh if UI looks stale.
- Do **not** commit unless the user asked; do **not** push rules/functions without user intent.

## User overrides

- **“hosting only”** / **“full deploy”** → follow literally.
- **“build only”** → verify loop, no `firebase deploy`.
- **Never** `firebase deploy --force` on rules without explicit user request.

See [reference.md](reference.md) for stack details.
