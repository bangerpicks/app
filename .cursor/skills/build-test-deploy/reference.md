# Banger Picks — build & deploy reference

## Stack

- **Next.js 14** with `output: 'export'` → `out/` (Firebase Hosting `public` in `firebase.json`)
- **Firebase**: hosting, functions, Firestore rules, storage rules
- Hosting **predeploy**: `npm run build` (runs again on `firebase deploy --only hosting`)

## Scripts (`package.json`)

| Script | Purpose |
|--------|---------|
| `build-test-deploy` | CI-style gate before release |
| `build:safe` | Clears `.next` then build (use if EISDIR/cache issues on Windows) |
| `test:unit` | Node test runner, no emulators |
| `test:rules` | Firestore/storage rules + migration tests via emulators |

## Common build failures

- **TypeScript**: `npm run type-check`
- **ESLint**: `npm run lint`
- **next build**: missing i18n keys, client/server boundary, static export constraints
- **Windows EISDIR**: `npm run build:safe`

## Functions & secrets

Functions deploy may require Secret Manager (`API_FOOTBALL_KEY` etc.). See `docs/setup/CLOUD-FUNCTION-API-KEY.md`. Do not deploy functions if secrets are not configured unless the user accepts that risk.

## Version metadata

`next.config.js` embeds `package.json` version, git SHA, and build date into `NEXT_PUBLIC_*` at build time.
