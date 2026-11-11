# Cloud Function API Key Setup

API-Football credentials are **server-only**. The Next.js static export never embeds the key.

## Set the secret (production)

Martin (or anyone deploying functions) must set Secret Manager before deploying scheduled/callable functions:

```bash
firebase functions:secrets:set API_FOOTBALL_KEY
```

Paste the API-Football key when prompted. Then build and deploy functions:

```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

Redeploy hosting after the client bundle update (no env var needed for API-Football on the client):

```bash
npm run build
firebase deploy --only hosting
```

### Rotate the old key

The key was previously shipped as `NEXT_PUBLIC_API_FOOTBALL_KEY` in the public JS bundle. After deploy, **rotate or revoke that key** in the [API-Football dashboard](https://dashboard.api-football.com/) and use the new value for `API_FOOTBALL_KEY` above.

## Local / emulator

For Firebase emulators or `functions:shell`, export the key in the environment (not in `NEXT_PUBLIC_*`):

```bash
export API_FOOTBALL_KEY=your-key-here
```

Legacy `firebase functions:config:set api_football.key="..."` is still read as a fallback but secrets are preferred.

## Verify

```bash
firebase functions:secrets:access API_FOOTBALL_KEY
firebase functions:log --only updateLiveFixtures
```

Healthy logs include early-exit lines when no fixtures are in the live window (`0 API calls`), not repeated HTTP 429 errors.

## Important notes

- Never commit API keys to Git.
- Secrets are per Firebase project — set them for dev/staging/production separately.
- Functions must be **redeployed** after creating or updating a secret.
