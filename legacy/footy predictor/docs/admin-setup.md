# Admin Setup Guide

## Overview
This guide explains how to set up admin access for the Footy Predictor admin dashboard.

## Current Status
The admin page currently has a temporary bypass for development purposes. This means any authenticated user can access the admin functions, but this is not secure for production use.

## Setting Up Proper Admin Access

### Option 1: User Document Flag (Recommended)
1. Go to your Firebase Console
2. Navigate to Firestore Database
3. Find the `users` collection
4. Locate your user document (by your UID)
5. Add a field: `isAdmin: true`

### Option 2: Settings Document Array
1. Go to your Firebase Console
2. Navigate to Firestore Database
3. Find or create the `settings` collection
4. Create or update the `app` document
5. Add a field: `adminUids: ["your-uid-here"]`

## Finding Your User UID
1. Open the browser console on the admin page
2. Look for a log message like: "User logged in: your-email@example.com"
3. The UID is automatically logged in the console

## Testing Admin Access
1. Use the test page: `test-admin-fixtures.html`
2. Test the "Test Admin Setup" section
3. Verify that admin functions work without permission errors

## Security Notes
- The current Firestore rules allow admin access based on the `isAdmin()` function
- This function checks both user document flags and settings array
- For production, remove the temporary bypass in `admin.js`
- Consider implementing role-based access control for different admin functions

## Troubleshooting
If you still get permission errors:
1. Check that your UID is correctly added to the admin list
2. Verify the Firestore rules are deployed
3. Check the browser console for detailed error messages
4. Ensure you're logged in with the correct account

## Production Deployment
Before deploying to production:
1. Remove the temporary admin bypass
2. Set up proper admin users
3. Test all admin functions
4. Review Firestore security rules
5. Consider implementing audit logging

