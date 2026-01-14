# Deployment Documentation

## Overview

This guide covers deploying Banger Picks to Firebase, including setup, configuration, and deployment procedures for hosting, Cloud Functions, Firestore, and Storage.

## Prerequisites

- **Node.js** 18+ and npm installed
- **Firebase CLI** installed globally (`npm install -g firebase-tools`)
- **Firebase account** ([sign up here](https://console.firebase.google.com/))
- **API-Football account** and API key
- **Git** for version control (recommended)

## Initial Firebase Setup

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

This opens your browser for authentication. After successful login, you're ready to use Firebase CLI.

### 3. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `banger-picks` (or your preferred name)
4. Enable/disable Google Analytics (optional)
5. Click "Create project"

### 4. Initialize Firebase in Your Project

```bash
cd "Banger Picks"
firebase init
```

**Select the following features**:
- ✅ **Firestore**: Setup security rules and indexes
- ✅ **Functions**: Configure Cloud Functions
- ✅ **Hosting**: Configure files for Firebase Hosting
- ✅ **Storage**: Setup default Storage bucket and security rules

**Configuration options**:

1. **Select existing project** or create a new one
2. **Firestore**:
   - Use default Firestore rules file: `firestore.rules`
   - Use default Firestore indexes file: `firestore.indexes.json`
3. **Functions**:
   - Language: **TypeScript**
   - ESLint: **Yes**
   - Install dependencies: **Yes**
4. **Hosting**:
   - Public directory: `.next` (Next.js output)
   - Configure as a single-page app: **No**
   - Set up automatic builds and deploys with GitHub: **Optional**
5. **Storage**:
   - Use default Storage rules file: `storage.rules`

### 5. Configure Firebase Project

Create `.firebaserc` if it doesn't exist:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Or set project alias:

```bash
firebase use --add
```

## Environment Configuration

### 1. Create Environment Files

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

### 2. Get Firebase Configuration

1. Go to Firebase Console > Project Settings > General
2. Scroll to "Your apps" section
3. If no web app exists, click "Add app" > Web icon (`</>`)
4. Register app with nickname (e.g., "Banger Picks Web")
5. Copy the Firebase configuration object

### 3. Configure Environment Variables

Edit `.env.local` with your values:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# API-Football Configuration
NEXT_PUBLIC_API_FOOTBALL_KEY=your-api-football-key
API_FOOTBALL_KEY=your-api-football-key  # For Cloud Functions

# Environment
NEXT_PUBLIC_APP_ENV=production
```

### 4. Configure Firebase Functions Secrets

For Cloud Functions that need API keys:

```bash
# Set API-Football key as secret
firebase functions:secrets:set API_FOOTBALL_KEY

# Enter your API-Football key when prompted
```

**Note**: Secrets are only accessible in Cloud Functions, not in Next.js runtime.

## Firebase Configuration Files

### firebase.json

Firebase configuration file:

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
  },
  "hosting": {
    "public": ".next",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### firestore.rules

Firestore security rules (see [database-schema.md](database-schema.md) for details).

### storage.rules

Storage security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User profile images
    match /users/{userId}/profile.jpg {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Shop item images (admin only)
    match /shop/{itemId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/settings/app) &&
        get(/databases/$(database)/documents/settings/app).data.adminUids.hasAny([request.auth.uid]);
    }
  }
}
```

## Building the Application

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 2. Build Next.js Application

```bash
npm run build
```

This creates the `.next` directory with production-ready files.

### 3. Build Cloud Functions (Optional)

Functions are built automatically during deployment, but you can build manually:

```bash
cd functions
npm run build
cd ..
```

## Deployment

### Deploy Everything

```bash
firebase deploy
```

This deploys:
- Next.js app to Firebase Hosting
- Cloud Functions
- Firestore security rules
- Firestore indexes
- Storage security rules

### Deploy Individual Services

**Hosting only**:
```bash
firebase deploy --only hosting
```

**Functions only**:
```bash
firebase deploy --only functions
```

**Firestore rules only**:
```bash
firebase deploy --only firestore:rules
```

**Firestore indexes only**:
```bash
firebase deploy --only firestore:indexes
```

**Storage rules only**:
```bash
firebase deploy --only storage
```

### Deploy to Specific Environment

If you have multiple Firebase projects (dev, staging, production):

```bash
# Deploy to production
firebase use production
firebase deploy

# Deploy to staging
firebase use staging
firebase deploy

# Deploy to development
firebase use development
firebase deploy
```

## Post-Deployment Setup

### 1. Initialize Admin Users

Create the settings document with admin UIDs:

1. Go to Firebase Console > Firestore Database
2. Create collection: `settings`
3. Create document: `app`
4. Add field: `adminUids` (array of strings with your user IDs)

```json
{
  "adminUids": ["your-user-id-here"],
  "appName": "Banger Picks",
  "maintenanceMode": false,
  "allowRegistrations": true,
  "shopEnabled": true,
  "minRedemptionPoints": 10,
  "defaultFixturesPerWeek": 10
}
```

### 2. Configure API-Football Domain Restrictions

1. Go to [API-SPORTS Dashboard](https://dashboard.api-football.com/)
2. Navigate to API Key settings
3. Enable domain restrictions
4. Add your production domain(s):
   - `your-project.firebaseapp.com`
   - `your-project.web.app`
   - Your custom domain (if configured)
   - `localhost` (for development, if supported)

### 3. Verify Deployment

1. **Hosting**: Visit `https://your-project.web.app`
2. **Functions**: Check Firebase Console > Functions for active functions
3. **Firestore**: Check Firebase Console > Firestore Database
4. **Storage**: Check Firebase Console > Storage

### 4. Monitor Cloud Functions

Check Cloud Functions logs:

```bash
firebase functions:log
```

Or view in Firebase Console > Functions > Logs.

## Custom Domain Setup

### 1. Add Custom Domain in Firebase

1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., `bangerpicks.com`)
4. Follow the DNS configuration instructions

### 2. Configure DNS

Add the required DNS records (A or CNAME) to your domain registrar.

### 3. SSL Certificate

Firebase automatically provisions SSL certificates via Let's Encrypt. This may take a few hours.

## Environment-Specific Deployments

### Development Environment

For local development:

```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, start Next.js dev server
npm run dev
```

### Staging Environment

Create a separate Firebase project for staging:

```bash
# Create staging project in Firebase Console
# Then link it:
firebase use --add
# Select staging project

# Deploy to staging
firebase use staging
firebase deploy
```

### Production Environment

```bash
# Ensure you're using production project
firebase use production

# Deploy
firebase deploy
```

## Continuous Deployment (CI/CD)

### GitHub Actions

Example workflow (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd functions && npm install && cd ..
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

### Service Account Setup

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely
4. Add to GitHub Secrets as `FIREBASE_SERVICE_ACCOUNT`

## Monitoring and Logging

### Cloud Functions Logs

```bash
# View all function logs
firebase functions:log

# View logs for specific function
firebase functions:log --only autoScoring

# Follow logs in real-time
firebase functions:log --follow
```

### Hosting Logs

```bash
firebase hosting:log
```

### Firestore Usage

Monitor Firestore usage in Firebase Console > Usage and Billing.

### Performance Monitoring

1. Enable Firebase Performance Monitoring in Firebase Console
2. Add Performance Monitoring SDK to your Next.js app
3. View performance metrics in Firebase Console

## Troubleshooting

### Deployment Failures

**Hosting deployment fails**:
- Check build errors: `npm run build`
- Verify `.next` directory exists
- Check `firebase.json` configuration

**Functions deployment fails**:
- Check TypeScript compilation errors
- Verify dependencies are installed
- Check function code for errors

**Firestore rules deployment fails**:
- Validate rules syntax: `firebase deploy --only firestore:rules --dry-run`
- Check for syntax errors in `firestore.rules`

### Function Not Running

1. Check function logs: `firebase functions:log --only functionName`
2. Verify function is deployed: Firebase Console > Functions
3. Check environment variables/secrets are set
4. Verify API keys are valid

### Hosting Not Updating

1. Clear browser cache
2. Check Firebase Hosting cache
3. Verify deployment was successful
4. Check `firebase.json` rewrites configuration

### Permission Errors

1. Verify Firestore security rules
2. Check user authentication
3. Verify admin UIDs are set correctly
4. Check Storage rules for file uploads

## Rollback

### Rollback Hosting

```bash
# List recent deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:rollback
```

### Rollback Functions

Functions cannot be rolled back automatically. Redeploy previous version:

```bash
git checkout <previous-commit>
firebase deploy --only functions
```

### Rollback Firestore Rules

```bash
git checkout <previous-version> firestore.rules
firebase deploy --only firestore:rules
```

## Cost Optimization

### Firestore

- Use indexes efficiently
- Limit query results
- Use pagination for large collections
- Monitor read/write operations

### Cloud Functions

- Optimize function execution time
- Use appropriate memory allocation
- Monitor invocation counts
- Consider caching where appropriate

### Hosting

- Optimize Next.js build
- Use image optimization
- Enable compression
- Monitor bandwidth usage

## Security Checklist

Before deploying to production:

- [ ] Environment variables are set correctly
- [ ] API keys are secured (domain restrictions, secrets)
- [ ] Firestore security rules are tested
- [ ] Storage rules are configured
- [ ] Admin users are set up
- [ ] Authentication is working
- [ ] CORS is configured correctly
- [ ] SSL certificates are active (custom domains)
- [ ] Error messages don't expose sensitive information
- [ ] Rate limiting is implemented (API calls)

## Maintenance

### Regular Tasks

1. **Monitor usage**: Check Firebase Console for usage and billing
2. **Update dependencies**: Regularly update npm packages
3. **Review logs**: Check for errors or issues
4. **Backup data**: Export Firestore data regularly (optional)
5. **Security updates**: Keep Firebase CLI and dependencies updated

### Updates

```bash
# Update Firebase CLI
npm install -g firebase-tools@latest

# Update dependencies
npm update
cd functions && npm update && cd ..
```

## Support

- **Firebase Documentation**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)
- **Firebase Status**: [status.firebase.google.com](https://status.firebase.google.com)
- **GitHub Issues**: Report bugs and feature requests
