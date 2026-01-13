# Auto-Scoring System

The auto-scoring system automatically updates user scores every 5 minutes by checking fixture results and awarding points for correct predictions.

## How It Works

1. **Scheduled Cloud Function**: Runs every 5 minutes via Firebase Functions
2. **Fixture Result Checking**: Fetches results from API-Football for unfinished fixtures
3. **Batch Updates**: Updates all user predictions and scores in a single transaction
4. **Real-time Updates**: Leaderboard updates automatically for all users (including anonymous)

## Benefits

- **99.6% reduction in API calls** (from 72,000 to 288 calls/day)
- **Always works** regardless of user login status
- **Consistent timing** - updates every 5 minutes
- **Scalable** - handles any number of users efficiently

## Deployment

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Deploy Functions

```bash
firebase deploy --only functions
```

### 3. Verify Function Status

Check the Firebase Console > Functions to see the `autoScoreUpdate` function running.

## Configuration

### Schedule
The function runs every 5 minutes by default. To change this, modify the schedule in `functions/index.js`:

```javascript
export const autoScoreUpdate = onSchedule('every 10 minutes', async (event) => {
  // Change to 'every 10 minutes', 'every 1 hour', etc.
});
```

### API Rate Limits
The function includes built-in rate limiting and error handling for API-Football calls.

## Monitoring

### Admin Panel
Access `/admin-scoring.html` to:
- View system status
- Monitor function execution
- View live logs
- Check statistics

### Firebase Console
- **Functions**: View execution logs and status
- **Firestore**: Monitor data updates in real-time
- **Logs**: Detailed execution logs

## Troubleshooting

### Function Not Running
1. Check Firebase Console > Functions
2. Verify the function is deployed and enabled
3. Check for errors in the function logs

### API Errors
1. Verify `RAPIDAPI_KEY` is set correctly
2. Check API-Football rate limits
3. Review function logs for specific error messages

### Score Updates Not Working
1. Verify fixtures have `status.short` set to 'FT', 'AET', or 'PEN'
2. Check that predictions exist and aren't already marked as `awarded: true`
3. Review Firestore security rules

## Security Rules

Ensure your Firestore rules allow the Cloud Function to read/write:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow Cloud Functions to read/write all documents
    match /{document=**} {
      allow read, write: if request.auth != null || request.auth.token.firebase.sign_in_provider == 'google.com';
    }
  }
}
```

## Cost Analysis

### Before (Client-side)
- 10 fixtures × 5 users × 60 calls/hour = 3,000 calls/hour
- 72,000 calls/day
- High cost, poor user experience

### After (Server-side)
- 10 calls every 5 minutes = 288 calls/day
- 99.6% reduction in API calls
- Consistent updates, better user experience

## Testing

### Manual Trigger
Use the admin panel to manually trigger scoring updates for testing.

### Test Data
Create test predictions and fixtures to verify the scoring logic works correctly.

## Future Enhancements

- **Webhook support** for real-time fixture updates
- **Configurable schedules** per league/timezone
- **Advanced scoring rules** (bonus points, multipliers)
- **Performance metrics** and analytics
