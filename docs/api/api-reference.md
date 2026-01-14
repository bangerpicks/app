# API Reference Documentation

## Overview

This document provides a comprehensive reference for all APIs used in Banger Picks, including API-Football integration, Next.js API routes, and Firebase Cloud Functions.

## Table of Contents

1. [API-Football Integration](#api-football-integration)
2. [Next.js API Routes](#nextjs-api-routes)
3. [Firebase Cloud Functions](#firebase-cloud-functions)
4. [Authentication](#authentication)
5. [Error Handling](#error-handling)

## API-Football Integration

### Overview

Banger Picks integrates with [API-Football.com](https://www.api-football.com/) to fetch match data, fixtures, results, and team information. The integration uses domain-restricted API keys for security.

### Base URL

```
https://v3.football.api-sports.io
```

### Authentication

**Header**: `x-apisports-key`

**Value**: Your API-Football API key (set via environment variable `NEXT_PUBLIC_API_FOOTBALL_KEY`)

**Security**: API key should be domain-restricted in the API-SPORTS dashboard to prevent unauthorized use.

### Request Format

All requests are GET requests only (API-Football policy).

### Common Endpoints

#### Fixtures

**Get Fixtures by Date Range**
```
GET /fixtures?from={date}&to={date}
```

**Parameters**:
- `from` (required): Start date (YYYY-MM-DD)
- `to` (required): End date (YYYY-MM-DD)
- `timezone` (optional): Timezone (e.g., "Europe/London")
- `league` (optional): League ID
- `team` (optional): Team ID
- `status` (optional): Match status (NS, LIVE, FT, etc.)

**Response**:
```typescript
{
  get: string;
  parameters: object;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: Array<{
    fixture: {
      id: number;
      referee: string | null;
      timezone: string;
      date: string;
      timestamp: number;
      periods: {
        first: number | null;
        second: number | null;
      };
      venue: {
        id: number | null;
        name: string | null;
        city: string | null;
      };
      status: {
        long: string;
        short: string;
        elapsed: number | null;
      };
    };
    league: {
      id: number;
      name: string;
      country: string;
      logo: string;
      flag: string | null;
      season: number;
      round: string;
    };
    teams: {
      home: {
        id: number;
        name: string;
        logo: string;
        winner: boolean | null;
      };
      away: {
        id: number;
        name: string;
        logo: string;
        winner: boolean | null;
      };
    };
    goals: {
      home: number | null;
      away: number | null;
    };
    score: {
      halftime: {
        home: number | null;
        away: number | null;
      };
      fulltime: {
        home: number | null;
        away: number | null;
      };
      extratime: {
        home: number | null;
        away: number | null;
      };
      penalty: {
        home: number | null;
        away: number | null;
      };
    };
  }>;
}
```

**Get Single Fixture**
```
GET /fixtures?id={fixtureId}
```

**Parameters**:
- `id` (required): Fixture ID

**Response**: Same structure as above, but with a single fixture in the response array.

**Get Head-to-Head**
```
GET /fixtures/headtohead?h2h={teamId1}-{teamId2}
```

**Parameters**:
- `h2h` (required): Team IDs separated by hyphen (e.g., "33-34")

**Get Fixture Statistics**
```
GET /fixtures/statistics?fixture={fixtureId}
```

**Parameters**:
- `fixture` (required): Fixture ID

#### Teams

**Get Teams**
```
GET /teams?league={leagueId}&season={season}
```

**Parameters**:
- `league` (optional): League ID
- `season` (optional): Season year (e.g., 2024)
- `id` (optional): Team ID

**Get Team Statistics**
```
GET /teams/statistics?league={leagueId}&season={season}&team={teamId}
```

**Parameters**:
- `league` (required): League ID
- `season` (required): Season year
- `team` (required): Team ID

#### Leagues

**Get Leagues**
```
GET /leagues?season={season}&country={country}
```

**Parameters**:
- `season` (optional): Season year
- `country` (optional): Country name
- `id` (optional): League ID

**Response**:
```typescript
{
  get: string;
  parameters: object;
  errors: any[];
  results: number;
  paging: object;
  response: Array<{
    league: {
      id: number;
      name: string;
      type: string;
      logo: string;
    };
    country: {
      name: string;
      code: string | null;
      flag: string | null;
    };
    seasons: Array<{
      year: number;
      start: string;
      end: string;
      current: boolean;
      coverage: object;
    }>;
  }>;
}
```

#### Standings

**Get Standings**
```
GET /standings?league={leagueId}&season={season}
```

**Parameters**:
- `league` (required): League ID
- `season` (required): Season year

### Rate Limits

API-Football enforces rate limits:
- Rate limit headers are included in responses
- Check `x-ratelimit-requests-remaining` header
- Recommended polling frequencies:
  - Static data (leagues, teams): Daily/hourly
  - Fixtures: Every 60 seconds when live
  - Results: Every 5 minutes

### Error Handling

**Status Codes**:
- `200`: Success
- `204`: No content (empty response)
- `400`: Bad request
- `403`: Forbidden (domain/key issue)
- `429`: Too many requests (rate limit)
- `499`: Client closed request (timeout)
- `500`: Server error

**Error Response Format**:
```typescript
{
  get: string;
  parameters: object;
  errors: Array<string>;
  results: number;
  paging: object;
  response: any[];
}
```

**Best Practices**:
- Implement retry logic with exponential backoff
- Cache responses when appropriate
- Handle rate limits gracefully
- Show user-friendly error messages
- Log errors for debugging

### Usage Example (Client-Side)

```typescript
// Using fetch with API key
const apiKey = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
const response = await fetch(
  `https://v3.football.api-sports.io/fixtures?from=2024-01-20&to=2024-01-22`,
  {
    headers: {
      'x-apisports-key': apiKey,
    },
  }
);

if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}

const data = await response.json();
// Use data.response array
```

### Usage Example (Server-Side / Cloud Functions)

```typescript
// In Next.js API route or Cloud Function
const apiKey = process.env.API_FOOTBALL_KEY; // Server-side key
const response = await fetch(
  `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
  {
    headers: {
      'x-apisports-key': apiKey,
    },
  }
);

const data = await response.json();
return data.response[0]; // Single fixture
```

## Next.js API Routes

### Overview

Next.js API routes are located in `src/app/api/` and provide server-side endpoints for the application.

### Authentication

All API routes (except public endpoints) require Firebase Authentication. The Firebase ID token should be included in the Authorization header:

```
Authorization: Bearer {firebaseIdToken}
```

### Endpoints

#### Predictions API

**POST /api/predictions**
Create or update predictions.

**Request**:
```typescript
{
  gameweekId: string;
  predictions: Array<{
    fixtureId: number;
    pick: 'H' | 'D' | 'A';
  }>;
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  data?: {
    predictionsCreated: number;
  };
}
```

**Status Codes**:
- `200`: Success
- `400`: Bad request (validation error)
- `401`: Unauthorized
- `500`: Server error

**GET /api/predictions?gameweekId={gameweekId}**
Get user's predictions for a gameweek.

**Response**:
```typescript
{
  success: boolean;
  data: Array<{
    fixtureId: number;
    pick: 'H' | 'D' | 'A';
    awarded: boolean;
    points: number;
    correct: boolean;
  }>;
}
```

#### Fixtures API

**GET /api/fixtures?gameweekId={gameweekId}**
Get fixtures for a gameweek.

**Response**:
```typescript
{
  success: boolean;
  data: Array<{
    fixtureId: number;
    fixture: object; // API-Football fixture data
    teams: object;
    league: object;
  }>;
}
```

**GET /api/fixtures/{fixtureId}**
Get a single fixture by ID.

**Response**:
```typescript
{
  success: boolean;
  data: {
    fixtureId: number;
    fixture: object;
    teams: object;
    league: object;
  };
}
```

#### Scoring API

**POST /api/scoring/trigger**
Manually trigger scoring for a gameweek (admin only).

**Request**:
```typescript
{
  gameweekId: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  data?: {
    scoresUpdated: number;
  };
}
```

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `500`: Server error

#### Users API

**GET /api/users/me**
Get current user's profile.

**Response**:
```typescript
{
  success: boolean;
  data: {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string | null;
    points: number;
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
  };
}
```

**PUT /api/users/me**
Update current user's profile.

**Request**:
```typescript
{
  displayName?: string;
  photoURL?: string;
  favoriteTeam?: {
    id: number;
    name: string;
    logo: string;
  };
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  data?: {
    user: object; // Updated user object
  };
}
```

#### Shop API

**GET /api/shop/items**
Get all active shop items.

**Response**:
```typescript
{
  success: boolean;
  data: Array<{
    itemId: string;
    name: string;
    description: string;
    category: 'digital' | 'physical';
    pointsCost: number;
    imageUrl: string;
    featured: boolean;
  }>;
}
```

**POST /api/shop/redeem**
Redeem a shop item (requires authentication).

**Request**:
```typescript
{
  itemId: string;
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  data?: {
    redemptionId: string;
    pointsRemaining: number;
  };
}
```

**Status Codes**:
- `200`: Success
- `400`: Bad request (insufficient points, item not available)
- `401`: Unauthorized
- `500`: Server error

## Firebase Cloud Functions

### Overview

Firebase Cloud Functions are serverless functions that run in the Firebase environment. They are located in `functions/src/`.

### Functions

#### Auto-Scoring Function

**Function Name**: `autoScoring`

**Trigger**: Scheduled (every 5 minutes)

**Description**: Automatically checks finished matches and awards points for correct predictions.

**Implementation**:
```typescript
export const autoScoring = onSchedule('every 5 minutes', async (event) => {
  // 1. Get active gameweeks
  // 2. For each gameweek, get fixtures
  // 3. For each finished fixture:
  //    - Fetch result from API-Football
  //    - Get all predictions for this fixture
  //    - Award points for correct predictions
  //    - Update user documents and prediction entries
});
```

**Environment Variables**:
- `API_FOOTBALL_KEY`: API-Football API key

**Deployment**:
```bash
firebase deploy --only functions:autoScoring
```

#### API-Football Proxy (Optional)

**Function Name**: `apiFootballProxy`

**Trigger**: HTTP (on-demand)

**Description**: Proxy for API-Football requests when domain restrictions are not available.

**Endpoint**: `https://{region}-{project-id}.cloudfunctions.net/apiFootballProxy`

**Usage**:
```typescript
const response = await fetch(
  `https://us-central1-project.cloudfunctions.net/apiFootballProxy?endpoint=fixtures&id=${fixtureId}`
);
```

**Security**: Requires Firebase Authentication token.

**Environment Variables**:
- `API_FOOTBALL_KEY`: API-Football API key

**Deployment**:
```bash
firebase deploy --only functions:apiFootballProxy
```

### Environment Configuration

Cloud Functions environment variables are set via Firebase CLI:

```bash
# Set secret
firebase functions:secrets:set API_FOOTBALL_KEY

# Access in function
import { defineSecret } from 'firebase-functions/params';
const apiFootballKey = defineSecret('API_FOOTBALL_KEY');
```

### Error Handling

Cloud Functions should:
- Log errors properly
- Handle API rate limits
- Retry transient failures
- Send notifications for critical errors

## Authentication

### Firebase Authentication

All authenticated endpoints require a Firebase ID token.

### Getting ID Token

**Client-Side**:
```typescript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
if (user) {
  const idToken = await user.getIdToken();
  // Include in Authorization header
}
```

### Verifying ID Token (Server-Side)

**Next.js API Route**:
```typescript
import { getAuth } from 'firebase-admin/auth';

const auth = getAuth();
const idToken = req.headers.authorization?.split('Bearer ')[1];
if (!idToken) {
  return res.status(401).json({ error: 'Unauthorized' });
}

const decodedToken = await auth.verifyIdToken(idToken);
const uid = decodedToken.uid;
```

**Cloud Function**:
```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';

export const myFunction = onCall(async (request) => {
  const idToken = request.auth?.token;
  if (!idToken) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  // Use request.auth.uid
});
```

## Error Handling

### Error Response Format

All API endpoints should return errors in a consistent format:

```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

### Best Practices

1. **Client-Side**:
   - Handle errors gracefully
   - Show user-friendly messages
   - Retry transient failures
   - Log errors for debugging

2. **Server-Side**:
   - Validate all inputs
   - Use appropriate HTTP status codes
   - Don't expose sensitive information
   - Log errors with context
