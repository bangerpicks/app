# Database Schema Documentation

## Overview

Banger Picks uses Cloud Firestore as its NoSQL document database. This document outlines the complete database structure, data models, security rules, and indexes.

## Collections Structure

```
Firestore Database
├── users/                          # User profiles and statistics
├── predictions/                    # Predictions collection
│   └── {fixtureId}/
│       └── entries/
│           └── {uid}/              # User predictions
├── gameweeks/                      # Gameweek management
│   └── {gameweekId}/
│       └── fixtures/
│           └── {fixtureId}/        # Gameweek fixtures
├── fixtures/                       # Match fixtures (optional, for caching)
├── shopItems/                      # Shop catalog
├── redemptions/                    # Point redemptions
└── settings/                       # Application settings
    └── app/                        # Main settings document
```

## Collection Details

### 1. Users Collection

**Path**: `users/{uid}`

**Description**: User profiles, statistics, and preferences.

**Document Structure**:
```typescript
{
  // Basic Info
  uid: string;                      // User ID (document ID)
  displayName: string;              // User display name
  email: string;                    // User email
  photoURL: string | null;          // Profile photo URL
  
  // Statistics
  points: number;                   // Total accumulated points (competitive points only)
  totalPredictions: number;         // Total predictions made
  correctPredictions: number;       // Correct predictions count
  accuracy: number;                 // Accuracy percentage (0-100)
  
  // Referral System
  referralCode: string;             // Unique referral code for this user
  referralPoints: number;           // Shop-only points from referrals (default: 0)
  referredBy: string | null;        // UID of referring user (optional, for analytics)
  
  // Preferences
  favoriteTeam: {
    id: number;
    name: string;
    logo: string;
  } | null;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

**Example**:
```json
{
  "uid": "user123",
  "displayName": "John Doe",
  "email": "john@example.com",
  "photoURL": "https://example.com/photo.jpg",
  "points": 125,
  "totalPredictions": 50,
  "correctPredictions": 35,
  "accuracy": 70,
  "referralCode": "ABC1234",
  "referralPoints": 15,
  "referredBy": null,
  "favoriteTeam": {
    "id": 33,
    "name": "Manchester United",
    "logo": "https://example.com/logo.png"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "lastLoginAt": "2024-01-15T10:30:00Z"
}
```

**Security Rules**:
- Read: Public (anyone can read)
- Create: Only if authenticated and `uid` matches `request.auth.uid`
- Update: Only if authenticated and `uid` matches `request.auth.uid`
- Delete: Not allowed (use Firebase Auth delete)

### 2. Predictions Collection

**Path**: `predictions/{fixtureId}/entries/{uid}`

**Description**: User predictions for specific fixtures. Uses subcollections for efficient querying.

**Document Structure**:
```typescript
{
  // User & Fixture Info
  uid: string;                      // User ID (document ID)
  fixtureId: number;                // API-Football fixture ID (parent document ID)
  
  // Prediction
  pick: 'H' | 'D' | 'A';           // Home Win, Draw, Away Win
  createdAt: Timestamp;             // When prediction was made
  
  // Scoring
  awarded: boolean;                 // Whether points have been awarded
  points: number;                   // Points awarded (0 or 1)
  correct: boolean;                 // Whether prediction was correct
  
  // Match Information (cached)
  homeTeam: {
    id: number;
    name: string;
    logo: string;
  };
  awayTeam: {
    id: number;
    name: string;
    logo: string;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
  };
  
  // Fixture Details
  fixtureDate: Timestamp;
  status: string;                   // Match status (NS, 1H, HT, 2H, ET, FT, etc.)
  
  // Result (when available)
  result: {
    homeGoals: number;
    awayGoals: number;
  } | null;
}
```

**Example**:
```json
{
  "uid": "user123",
  "fixtureId": 123456,
  "pick": "H",
  "createdAt": "2024-01-15T10:00:00Z",
  "awarded": true,
  "points": 1,
  "correct": true,
  "homeTeam": {
    "id": 33,
    "name": "Manchester United",
    "logo": "https://example.com/logo.png"
  },
  "awayTeam": {
    "id": 50,
    "name": "Manchester City",
    "logo": "https://example.com/logo2.png"
  },
  "league": {
    "id": 39,
    "name": "Premier League",
    "country": "England",
    "logo": "https://example.com/league.png"
  },
  "fixtureDate": "2024-01-20T15:00:00Z",
  "status": "FT",
  "result": {
    "homeGoals": 2,
    "awayGoals": 1
  }
}
```

**Security Rules**:
- Read: Public (anyone can read)
- Create: Only if authenticated and `uid` matches `request.auth.uid`
- Update: Only if authenticated and `uid` matches `request.auth.uid`
- Delete: Not allowed (predictions are permanent)

**Parent Document**: `predictions/{fixtureId}`
- Created automatically when first prediction is made
- Read: Public
- Create: Any authenticated user
- Update: Not allowed

### 3. Gameweeks Collection

**Path**: `gameweeks/{gameweekId}`

**Description**: Weekly gameweek management with 10 curated matches.

**Document Structure**:
```typescript
{
  // Basic Info
  gameweekId: string;               // Gameweek ID (document ID)
  name: string;                     // "Gameweek 1", "Week 1", etc.
  description: string;              // Optional description
  
  // Dates
  startDate: Timestamp;             // Start date/time
  endDate: Timestamp;               // End date/time
  deadline: Timestamp;              // Prediction deadline (1 hour before first kickoff)
  
  // Status
  status: 'draft' | 'active' | 'completed' | 'archived';
  
  // Fixtures
  fixtureIds: number[];             // Array of API-Football fixture IDs (max 10)
  
  // Metadata
  createdBy: string;                // Admin user ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Subcollection**: `gameweeks/{gameweekId}/fixtures/{fixtureId}`

**Fixture Subcollection Structure**:
```typescript
{
  fixtureId: number;                // API-Football fixture ID (document ID)
  fixture: {                        // Full fixture data from API-Football
    id: number;
    date: Timestamp;
    status: object;
    // ... other API-Football fixture fields
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
  };
  addedBy: string;                  // Admin user ID
  addedAt: Timestamp;
}
```

**Example**:
```json
{
  "gameweekId": "gw-2024-01",
  "name": "Gameweek 1",
  "description": "Opening weekend",
  "startDate": "2024-01-20T15:00:00Z",
  "endDate": "2024-01-22T20:00:00Z",
  "deadline": "2024-01-20T14:00:00Z",
  "status": "active",
  "fixtureIds": [123456, 123457, 123458, 123459, 123460, 123461, 123462, 123463, 123464, 123465],
  "createdBy": "admin123",
  "createdAt": "2024-01-15T00:00:00Z",
  "updatedAt": "2024-01-15T00:00:00Z"
}
```

**Security Rules**:
- Read: Public (anyone can read)
- Create: Admin only
- Update: Admin only
- Delete: Admin only

### 4. Shop Items Collection

**Path**: `shopItems/{itemId}`

**Description**: Items available for redemption in the shop.

**Document Structure**:
```typescript
{
  // Basic Info
  itemId: string;                   // Item ID (document ID)
  name: string;                     // Item name
  description: string;              // Item description
  category: 'digital' | 'physical'; // Item category
  
  // Pricing
  pointsCost: number;               // Points required for redemption
  
  // Digital Items
  badge?: string;                   // Badge ID (for digital items)
  theme?: string;                   // Theme ID (for digital items)
  customization?: object;           // Profile customization (for digital items)
  
  // Physical Items
  shippingRequired?: boolean;       // Whether shipping is required
  stock?: number;                   // Available stock (null = unlimited)
  
  // Display
  imageUrl: string;                 // Item image URL
  featured: boolean;                // Whether item is featured
  
  // Metadata
  status: 'active' | 'inactive' | 'sold_out';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Example**:
```json
{
  "itemId": "item123",
  "name": "Premium Badge",
  "description": "Show off your prediction skills",
  "category": "digital",
  "pointsCost": 100,
  "badge": "premium",
  "imageUrl": "https://example.com/badge.png",
  "featured": true,
  "status": "active",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Security Rules**:
- Read: Public (anyone can read active items)
- Create: Admin only
- Update: Admin only
- Delete: Admin only

### 5. Redemptions Collection

**Path**: `redemptions/{redemptionId}`

**Description**: User point redemptions for shop items.

**Document Structure**:
```typescript
{
  // Basic Info
  redemptionId: string;             // Redemption ID (document ID)
  userId: string;                   // User ID
  itemId: string;                   // Shop item ID
  
  // Transaction
  pointsCost: number;               // Points deducted
  redeemedAt: Timestamp;            // When redemption was made
  
  // Status
  status: 'pending' | 'processing' | 'fulfilled' | 'cancelled';
  
  // Physical Items
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  
  // Fulfillment
  fulfilledAt?: Timestamp;
  trackingNumber?: string;
  
  // Metadata
  notes?: string;                   // Admin notes
  updatedAt: Timestamp;
}
```

**Example**:
```json
{
  "redemptionId": "redemption123",
  "userId": "user123",
  "itemId": "item456",
  "pointsCost": 50,
  "redeemedAt": "2024-01-15T12:00:00Z",
  "status": "fulfilled",
  "shippingAddress": {
    "name": "John Doe",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "USA"
  },
  "fulfilledAt": "2024-01-20T10:00:00Z",
  "trackingNumber": "TRACK123456",
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

**Security Rules**:
- Read: Users can read their own redemptions, admins can read all
- Create: Authenticated users (can only create for themselves)
- Update: Admin only (for status updates)
- Delete: Not allowed (redemptions are permanent records)

### 6. Referrals Collection

**Path**: `referrals/{referralId}`

**Description**: Tracks referral relationships and rewards.

**Document Structure**:
```typescript
{
  referrerUid: string;              // User who made the referral
  referredUid: string;              // User who was referred
  referralCode: string;             // Referral code used
  status: 'pending' | 'completed';  // Referral status
  pointsAwarded: number;            // Points awarded (5)
  createdAt: Timestamp;             // When referral was created
  completedAt: Timestamp | null;    // When referral was completed
}
```

**Example**:
```json
{
  "referrerUid": "user123",
  "referredUid": "user456",
  "referralCode": "ABC1234",
  "status": "completed",
  "pointsAwarded": 5,
  "createdAt": "2024-01-15T10:00:00Z",
  "completedAt": "2024-01-15T10:05:00Z"
}
```

**Security Rules**:
- Read: Users can read referrals where they are the referrer or referred user
- Create: Server-side only (via Cloud Functions or API routes)
- Update: Server-side only
- Delete: Not allowed (referrals are permanent records)

### 7. Settings Collection

**Path**: `settings/app`

**Description**: Application-wide settings and configuration.

**Document Structure**:
```typescript
{
  // Admin Configuration
  adminUids: string[];              // Array of admin user IDs
  
  // Application Settings
  appName: string;                  // "Banger Picks"
  maintenanceMode: boolean;         // Whether app is in maintenance mode
  allowRegistrations: boolean;      // Whether new registrations are allowed
  
  // Shop Settings
  shopEnabled: boolean;             // Whether shop is enabled
  minRedemptionPoints: number;      // Minimum points for redemption
  
  // Gameweek Settings
  defaultFixturesPerWeek: number;   // Default number of fixtures per gameweek (10)
  
  // Metadata
  updatedAt: Timestamp;
}
```

**Example**:
```json
{
  "adminUids": ["admin123", "admin456"],
  "appName": "Banger Picks",
  "maintenanceMode": false,
  "allowRegistrations": true,
  "shopEnabled": true,
  "minRedemptionPoints": 10,
  "defaultFixturesPerWeek": 10,
  "updatedAt": "2024-01-15T00:00:00Z"
}
```

**Security Rules**:
- Read: Public
- Create: Any authenticated user (first-time bootstrap only)
- Update: Admin only
- Delete: Admin only

## Security Rules

### Overview

Firestore security rules enforce access control at the database level. All rules are defined in `firestore.rules`.

### Key Functions

**isAdmin()**
```javascript
function isAdmin() {
  return request.auth != null &&
    get(/databases/$(database)/documents/settings/app).data.adminUids.hasAny([request.auth.uid]);
}
```

Checks if the authenticated user is in the admin list.

### Rules Summary

**Users**
- Read: Public
- Create: Authenticated users (own document only)
- Update: Authenticated users (own document only)

**Predictions**
- Parent: Read public, create authenticated, update not allowed
- Entries: Read public, create/update authenticated (own entries only)

**Gameweeks**
- Read: Public
- Create/Update/Delete: Admin only

**Shop Items**
- Read: Public (active items)
- Create/Update/Delete: Admin only

**Redemptions**
- Read: Users (own redemptions), Admins (all)
- Create: Authenticated users (own redemptions only)
- Update: Admin only
- Delete: Not allowed

**Referrals**
- Read: Users (own referrals)
- Create: Server-side only
- Update: Server-side only
- Delete: Not allowed

**Settings**
- Read: Public
- Create: Authenticated (bootstrap only)
- Update/Delete: Admin only

## Indexes

Firestore requires composite indexes for certain queries. Indexes are defined in `firestore.indexes.json`.

### Required Indexes

**Users Collection**
- `users`: Order by `points` (descending) - for leaderboards
- `users`: Order by `points` (descending), then by `totalPredictions` (descending) - for tie-breaking

**Redemptions Collection**
- `redemptions`: Where `userId == {userId}`, order by `redeemedAt` (descending)
- `redemptions`: Where `status == {status}`, order by `redeemedAt` (descending)

**Gameweeks Collection**
- `gameweeks`: Where `status == 'active'`, order by `startDate` (descending)

### Creating Indexes

Indexes can be created:

1. **Automatically**: When Firestore detects a query that requires an index, it provides a link to create it
2. **Manually**: Via `firestore.indexes.json` and deploy with `firebase deploy --only firestore:indexes`
3. **Console**: Via Firebase Console > Firestore > Indexes

## Data Validation

While Firestore doesn't enforce schema validation, the application should validate data:

1. **Client-side**: Using Zod schemas before writing
2. **Server-side**: In Cloud Functions before processing
3. **TypeScript**: Type definitions for compile-time checking

## Best Practices

1. **Keep documents small**: Store frequently accessed data, cache external data
2. **Use subcollections**: For hierarchical data (predictions/entries)
3. **Denormalize when needed**: Store frequently accessed data in multiple places
4. **Use timestamps**: Always use Firestore Timestamp type, not JavaScript Date
5. **Index strategically**: Create indexes for queries, but avoid over-indexing
6. **Security first**: Always enforce rules, validate on client and server
7. **Batch operations**: Use batch writes for multiple operations

## Migration Notes

When migrating from the legacy app:
- `weeklySelections` → `gameweeks`
- `weeks` → `gameweeks`
- Prediction structure remains similar but enhanced with more fields
