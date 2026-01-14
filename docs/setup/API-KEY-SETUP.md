# API-Football API Key Setup Guide

This guide will help you set up your API-Football API key for the admin dashboard.

## Step 1: Get Your API-Football API Key

1. **Sign up for API-Football** (if you haven't already):
   - Go to [https://www.api-football.com/](https://www.api-football.com/)
   - Click "Sign Up" or "Get Started"
   - Create an account

2. **Get your API key**:
   - After signing up, go to your dashboard
   - Navigate to "API" or "Subscription" section
   - Copy your API key (it looks like: `abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`)

3. **Choose a subscription plan**:
   - Free tier: Limited requests per day (usually 100 requests/day)
   - Paid plans: More requests and features
   - For development/testing, the free tier is usually sufficient

## Step 2: Create Environment File

1. **Check if `.env.local` exists**:
   ```bash
   # In your project root directory
   ls .env.local
   # or on Windows:
   dir .env.local
   ```

2. **Create `.env.local` file** (if it doesn't exist):
   ```bash
   # On Mac/Linux:
   touch .env.local
   
   # On Windows (PowerShell):
   New-Item .env.local -ItemType File
   ```

## Step 3: Add Your API Key

1. **Open `.env.local` in a text editor**

2. **Add the following line**:
   ```env
   NEXT_PUBLIC_API_FOOTBALL_KEY=your-api-key-here
   ```

   Replace `your-api-key-here` with your actual API key from Step 1.

   **Example:**
   ```env
   NEXT_PUBLIC_API_FOOTBALL_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
   ```

3. **Save the file**

## Step 4: Verify Setup

1. **Restart your development server** (if it's running):
   ```bash
   # Stop the server (Ctrl+C)
   # Then start it again:
   npm run dev
   ```

2. **Test the API key**:
   - Go to `/admin` (after setting up admin access)
   - Try to create a new gameweek
   - Use the fixture search feature
   - If it works, you should see fixtures appear when you search

## Step 5: Troubleshooting

### Error: "NEXT_PUBLIC_API_FOOTBALL_KEY environment variable is not set"

**Solution:**
- Make sure `.env.local` is in the project root (same directory as `package.json`)
- Make sure the variable name is exactly: `NEXT_PUBLIC_API_FOOTBALL_KEY`
- Restart your development server after adding the key
- Check for typos in the variable name or value

### Error: "API-Football request failed: 401"

**Solution:**
- Your API key is invalid or expired
- Check that you copied the entire key correctly
- Verify your API-Football subscription is active
- Make sure there are no extra spaces in the `.env.local` file

### Error: "API-Football request failed: 429"

**Solution:**
- You've exceeded your daily request limit
- Wait until the limit resets (usually at midnight UTC)
- Consider upgrading to a paid plan for more requests

### Fixtures Not Appearing

**Solution:**
- Check the browser console for errors
- Verify your API key is correct
- Make sure the date range you're searching includes actual match dates
- Check that the league you selected has fixtures in that date range

## Important Notes

1. **Never commit `.env.local` to Git**
   - This file should already be in `.gitignore`
   - It contains sensitive information

2. **For Production Deployment**
   - Set the environment variable in your hosting platform:
     - **Vercel**: Project Settings → Environment Variables
     - **Netlify**: Site Settings → Environment Variables
     - **Firebase Hosting**: Use Firebase Functions or set in hosting config

3. **API Key Security**
   - The key is prefixed with `NEXT_PUBLIC_` which means it's exposed to the browser
   - This is intentional for API-Football (they use domain restrictions)
   - Make sure to set up domain restrictions in your API-Football dashboard

## Setting Up Domain Restrictions (Recommended)

1. Go to your API-Football dashboard
2. Navigate to "API" or "Settings"
3. Find "Domain Restrictions" or "Allowed Domains"
4. Add your domains:
   - `localhost` (for development)
   - `yourdomain.com` (for production)
   - `*.vercel.app` (if using Vercel)

This prevents unauthorized use of your API key.

## Complete `.env.local` Example

Here's what a complete `.env.local` file might look like:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDuSXcug9nzMGQilm5377mo7TPnMJOrBSE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=banger-picks.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=banger-picks
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=banger-picks.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=724898846036
NEXT_PUBLIC_FIREBASE_APP_ID=1:724898846036:web:f002fb3c714dfe865ee4c1

# API-Football Configuration
NEXT_PUBLIC_API_FOOTBALL_KEY=your-api-key-here

# Environment
NEXT_PUBLIC_APP_ENV=development
```

## Quick Reference

- **Environment file**: `.env.local` (in project root)
- **Variable name**: `NEXT_PUBLIC_API_FOOTBALL_KEY`
- **Get API key**: [https://www.api-football.com/](https://www.api-football.com/)
- **Restart server**: Required after adding/changing environment variables
