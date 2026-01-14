# Cloud Function API Key Setup

This guide explains how to configure the API-Football API key for the cloud function that updates live scores.

## Problem

The `updateLiveFixtures` cloud function requires an API-Football API key to fetch live match data. Without it, the function will fail with the error:
```
Error: API_FOOTBALL_KEY not configured
```

## Solution: Set Firebase Config

The cloud function uses Firebase config to store the API key. This is the simplest and most reliable method for v1 functions.

### Step 1: Get Your API Key

1. Go to [API-Football Dashboard](https://dashboard.api-football.com/)
2. Navigate to your API key section
3. Copy your API key

**OR** if you already have it in your `.env.local` file:
- Check `.env.local` for `NEXT_PUBLIC_API_FOOTBALL_KEY`
- Copy that value

### Step 2: Set the Config in Firebase

Run this command in your terminal (from the project root):

**Windows (PowerShell):**
```powershell
firebase functions:config:set api_football.key="your-api-key-here"
```

**Mac/Linux:**
```bash
firebase functions:config:set api_football.key="your-api-key-here"
```

**Important**: Replace `your-api-key-here` with your actual API key. Keep the quotes around it.

### Step 3: Redeploy the Cloud Function

After setting the config, redeploy the function:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:updateLiveFixtures
```

### Step 4: Verify It's Working

1. Check the function logs:
   ```bash
   firebase functions:log --only updateLiveFixtures
   ```

2. Wait a minute for the scheduled function to run, then check logs again.

3. You should see logs like:
   ```
   [updateLiveFixtures] Starting live fixture update...
   [updateLiveFixtures] Found 1 active gameweek(s)
   [updateLiveFixtures] Fetching X fixtures from API-Football...
   [updateLiveFixtures] Received X fixtures from API-Football
   [updateLiveFixtures] Updated X fixtures for gameweek ...
   ```

   **NOT** errors about `API_FOOTBALL_KEY not configured`.

## Troubleshooting

### Secret Not Working

If you set the secret but it's still not working:

1. Make sure you redeployed the function after setting the secret
2. Check that the secret name matches exactly: `API_FOOTBALL_KEY`
3. View secret status:
   ```bash
   firebase functions:secrets:access API_FOOTBALL_KEY
   ```

### Function Still Failing

1. Check function logs for specific errors
2. Verify your API key is valid and has available requests
3. Make sure the function has the correct permissions

## Important Notes

- **Never commit API keys to Git** - Secrets are stored securely in Firebase
- **Secrets are environment-specific** - Set them for each Firebase project (dev, staging, production)
- **Function must be redeployed** after setting secrets for them to take effect
- **Live scores update every 1 minute** - The function runs automatically via a scheduled trigger
