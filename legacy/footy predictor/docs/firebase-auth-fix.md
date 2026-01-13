# Firebase Authorization Issue Fix

## Problem Description

Users were experiencing a Firebase "unauthorized" alert after selecting picks, even though the picks were successfully saved to the database. This indicated a race condition or timing issue between Firebase authentication state and Firestore operations.

## Root Causes Identified

### 1. **Race Condition in Authentication State**
- The `onUserChanged` callback in `app.js` was calling `ensureUserDoc` after user authentication
- This could race with the picks submission process
- If the auth token expired or became invalid between picks saving and user document creation, authorization errors would occur

### 2. **Token Expiration Timing**
- Firebase auth tokens have a limited lifespan (typically 1 hour)
- If a user's session was near expiration when they submitted picks, subsequent operations could fail
- The error would appear after successful picks saving because the token expired during the process

### 3. **Multiple Firestore Operations**
- The `savePredictions` function performs multiple operations:
  - Creates/updates parent prediction documents
  - Creates/updates user entry documents
- If the first operation succeeded but the second failed due to auth timing, users would see the error

## Fixes Implemented

### 1. **Enhanced Authentication Verification**
```javascript
// In app.js - submit button handler
try {
  const { verifyAuthState } = await import('./auth.js');
  await verifyAuthState(); // Forces token refresh and verification
} catch (authError) {
  alert('Authentication expired. Please log in again.');
  return;
}
```

### 2. **Pre-flight User Document Creation**
```javascript
// Ensure user document exists before saving predictions
const { ensureUserDoc } = await import('./scoring.js');
await ensureUserDoc(user.uid, user.displayName || user.email?.split('@')[0]);
```

### 3. **Improved Error Handling**
```javascript
// Better error categorization and user feedback
if (err.code === 'permission-denied' || err.code === 'unauthenticated') {
  alert('Authentication error. Please log in again and try submitting your picks.');
} else {
  alert('Error saving predictions: ' + err.message);
}
```

### 4. **Authentication State Monitoring**
```javascript
// In auth.js - monitor token refresh
user.getIdTokenResult().then((idTokenResult) => {
  const tokenRefreshInterval = setInterval(async () => {
    try {
      const newToken = await user.getIdToken(true);
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearInterval(tokenRefreshInterval);
    }
  }, (idTokenResult.expirationTime - Date.now()) - 60000);
});
```

### 5. **Enhanced Logging and Debugging**
- Added comprehensive console logging throughout the picks submission process
- Created debug functions to test Firebase operations
- Added debug page (`debug-api.html`) for troubleshooting

## Testing the Fix

### 1. **Use the Debug Button**
- On the main page, click the 🐛 Debug button
- This will test all Firebase operations in sequence
- Check the browser console for detailed logs

### 2. **Monitor Console Logs**
- The enhanced logging will show exactly where any failures occur
- Look for authentication state changes and token refresh events

### 3. **Use the Debug Page**
- Navigate to `/debug-api.html`
- Test individual Firebase operations
- Monitor authentication status and token validity

## Prevention Measures

### 1. **Token Refresh Strategy**
- Force token refresh before critical operations
- Monitor token expiration and refresh proactively
- Handle token refresh failures gracefully

### 2. **Operation Ordering**
- Ensure user document exists before saving predictions
- Perform authentication checks before each Firestore operation
- Use batch operations where possible to maintain consistency

### 3. **Error Recovery**
- Provide clear error messages for authentication issues
- Guide users to re-authenticate when needed
- Preserve user data during authentication failures

## Monitoring and Maintenance

### 1. **Console Monitoring**
- Watch for authentication state change logs
- Monitor token refresh success/failure rates
- Track Firestore operation success rates

### 2. **User Experience**
- Ensure users receive clear feedback about authentication issues
- Minimize the impact of authentication failures on user data
- Provide easy recovery paths for authentication problems

### 3. **Performance Impact**
- The additional authentication checks add minimal overhead
- Token refresh operations are infrequent (once per hour)
- Batch operations minimize database round trips

## Future Improvements

### 1. **Proactive Token Management**
- Implement background token refresh before expiration
- Add retry logic for failed operations
- Cache authentication state to reduce API calls

### 2. **Enhanced Error Recovery**
- Implement automatic retry for failed operations
- Add offline support for picks submission
- Provide better user guidance for common issues

### 3. **Monitoring and Analytics**
- Track authentication failure rates
- Monitor user experience metrics
- Implement alerting for critical authentication issues
