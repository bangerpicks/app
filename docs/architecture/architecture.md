# Architecture Documentation

## System Architecture

Banger Picks is built with a modern, scalable architecture using Next.js, TypeScript, and Firebase. The application follows a serverless architecture pattern with client-side rendering, server-side rendering, and static generation where appropriate.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Next.js    │  │  React Query │  │   Zustand    │     │
│  │   App Router │  │   (TanStack) │  │    Store     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ HTTPS
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    Firebase Infrastructure                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Firebase   │  │   Firebase   │  │   Firebase   │     │
│  │  Auth (Auth) │  │ Firestore DB │  │   Storage    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│  ┌─────────────────────────┴───────────────────────────┐   │
│  │          Firebase Cloud Functions                    │   │
│  │  ┌──────────────┐  ┌──────────────────────────────┐ │   │
│  │  │ Auto-Scoring │  │     API-Football Proxy       │ │   │
│  │  │  (Scheduled) │  │     (On-Demand)              │ │   │
│  │  └──────────────┘  └──────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                             │
                             │ HTTPS API
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    External APIs                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API-Football.com                        │  │
│  │  (Fixtures, Teams, Leagues, Results, Statistics)     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Layer

**Next.js 14+ (App Router)**
- Server-side rendering (SSR) for dynamic content
- Static site generation (SSG) for static pages
- API routes for server-side logic
- Image optimization
- Built-in routing and layout system

**React 18+**
- Component-based UI architecture
- Hooks for state and side effects
- Concurrent features for better performance

**TypeScript**
- Type safety across the application
- Better IDE support and refactoring
- Reduced runtime errors

### State Management

**React Query (TanStack Query)**
- Server state management
- Caching and synchronization
- Background refetching
- Optimistic updates

**Zustand**
- Client-side global state
- Lightweight alternative to Redux
- Simple API for state management

**React Context**
- Auth state
- Theme preferences
- UI state that doesn't need persistence

### UI Libraries

**Tailwind CSS**
- Utility-first CSS framework
- Responsive design utilities
- Custom design system integration

**Lucide React**
- Icon library
- Tree-shakeable icons
- Consistent iconography

**Shadcn/ui**
- High-quality component library
- Built on Radix UI primitives
- Fully customizable

**Framer Motion**
- Animation library
- Smooth transitions
- Gesture support

### Backend Layer

**Firebase Authentication**
- Email/password authentication
- Social authentication (Google, etc.)
- User session management

**Cloud Firestore**
- NoSQL document database
- Real-time listeners
- Offline support
- Automatic scaling

**Firebase Storage**
- Image and file storage
- CDN distribution
- Secure file uploads

**Firebase Cloud Functions**
- Serverless functions
- Scheduled tasks (auto-scoring)
- API proxying
- Server-side validation

**Firebase Hosting**
- Static site hosting
- CDN distribution
- Custom domain support
- SSL certificates

### External Services

**API-Football.com**
- Match fixtures and results
- Team information and statistics
- League data
- Player statistics

## Data Flow

### User Authentication Flow

```
User Action → Next.js Page → Firebase Auth → Firestore
     │              │              │            │
     │              │              │            │
     ▼              ▼              ▼            ▼
Sign Up/Login → Auth Hook → Auth Service → User Doc Created
```

1. User submits credentials on login/signup page
2. Next.js page calls authentication hook
3. Hook uses Firebase Auth SDK
4. Firebase Auth authenticates user
5. On success, user document created/updated in Firestore
6. Auth state updates in Zustand store
7. User redirected to dashboard

### Prediction Submission Flow

```
User Input → Form Component → React Hook Form → Validation
     │              │              │                │
     │              │              │                │
     ▼              ▼              ▼                ▼
Select Match → Submit Form → Zod Schema → Firestore Write
```

1. User selects prediction (H/D/A) for each match
2. Form validation with React Hook Form + Zod
3. Validated data sent to Next.js API route
4. API route writes to Firestore
5. React Query invalidates cache
6. UI updates optimistically

### Auto-Scoring Flow

```
Scheduled Trigger → Cloud Function → API-Football → Process Results
       │                 │                │              │
       │                 │                │              │
       ▼                 ▼                ▼              ▼
Every 5 minutes → Function Executes → Fetch Results → Update Scores
```

1. Cloud Function triggered every 5 minutes (scheduled)
2. Function queries Firestore for unfinished matches
3. For each match, fetch result from API-Football
4. Compare user predictions with actual results
5. Award points for correct predictions
6. Update user documents and prediction entries
7. Leaderboards update automatically via Firestore listeners

### Leaderboard Data Flow

```
Page Load → React Query → Firestore Query → Cache → UI Render
     │           │              │              │         │
     │           │              │              │         │
     ▼           ▼              ▼              ▼         ▼
Leaderboard → useQuery → Firestore SDK → Store → Display
```

1. Leaderboard page loads
2. React Query hook fetches leaderboard data
3. Query reads from Firestore `users` collection
4. Data sorted by points (descending)
5. Result cached by React Query
6. UI renders leaderboard table
7. Real-time updates via Firestore listeners

## Component Structure

### Component Organization

```
src/components/
├── ui/                    # Reusable UI primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── select.tsx
│   └── ...
├── layout/                # Layout components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Navigation.tsx
│   └── Sidebar.tsx
├── predictions/           # Prediction-specific components
│   ├── PredictionCard.tsx
│   ├── MatchCard.tsx
│   ├── PredictionForm.tsx
│   └── PredictionList.tsx
├── leaderboard/           # Leaderboard components
│   ├── LeaderboardTable.tsx
│   ├── LeaderboardRow.tsx
│   ├── WeeklyLeaderboard.tsx
│   └── AllTimeLeaderboard.tsx
├── shop/                  # Shop components
│   ├── ShopGrid.tsx
│   ├── ShopItem.tsx
│   ├── Cart.tsx
│   └── RedeemModal.tsx
└── admin/                 # Admin components
    ├── AdminDashboard.tsx
    ├── GameweekManager.tsx
    ├── FixtureSelector.tsx
    └── UserManager.tsx
```

### Component Patterns

**Server Components (Default)**
- Data fetching at server level
- No client-side JavaScript
- Better performance
- Used for static content and initial data

**Client Components**
- Interactive features
- State management
- Browser APIs
- Marked with `'use client'` directive

**Layout Components**
- Shared UI across routes
- Nested layouts
- Metadata management

**Page Components**
- Route entry points
- Data loading
- Server/client component composition

## State Management Strategy

### Server State (React Query)

- User data
- Predictions
- Leaderboards
- Match fixtures
- Shop items

Benefits:
- Automatic caching
- Background refetching
- Optimistic updates
- Error handling

### Client State (Zustand)

- Authentication state
- UI preferences
- Theme settings
- Shopping cart (temporary)

Benefits:
- Simple API
- No prop drilling
- Persistence support
- DevTools integration

### Form State (React Hook Form)

- All form inputs
- Validation state
- Submission state

Benefits:
- Minimal re-renders
- Built-in validation
- Easy integration with Zod

## Authentication Architecture

### Auth Flow

1. **Initial Load**: Check for existing session
2. **Protected Routes**: Middleware checks authentication
3. **Auth Context**: Provides auth state to all components
4. **Zustand Store**: Syncs with Firebase Auth state
5. **Firestore Rules**: Server-side authorization

### Protected Routes

- `/predictions` - Requires authentication
- `/leaderboard` - Public read, authenticated features
- `/profile` - Requires authentication
- `/shop` - Requires authentication
- `/admin/*` - Requires admin role

## API Architecture

### Next.js API Routes

Located in `src/app/api/`

**Endpoints:**
- `/api/predictions` - CRUD operations for predictions
- `/api/fixtures` - Fetch match fixtures
- `/api/scoring` - Manual scoring triggers
- `/api/users` - User data operations
- `/api/shop` - Shop item operations

### Firebase Cloud Functions

Located in `functions/src/`

**Functions:**
- `autoScoring` - Scheduled function for automatic scoring
- `apiFootballProxy` - Proxy for API-Football requests (if needed)

### External APIs

**API-Football.com**
- Direct integration from client (with domain restrictions)
- Cloud Function proxy for sensitive operations
- Rate limiting handled client-side

## Database Architecture

See [database-schema.md](database-schema.md) for detailed schema documentation.

### Collections Overview

- `users` - User profiles and statistics
- `predictions` - User predictions (subcollections)
- `gameweeks` - Gameweek management
- `fixtures` - Match fixtures
- `shopItems` - Shop catalog
- `redemptions` - Point redemptions
- `settings` - Application settings

## Security Architecture

### Authentication Security

- Firebase Authentication handles password hashing
- JWT tokens for session management
- Secure cookie storage
- Session expiration handling

### Authorization Security

- Firestore security rules for data access
- Role-based access control (RBAC)
- Admin role checking
- API route authentication middleware

### Data Security

- Input validation with Zod
- SQL injection prevention (NoSQL, but still sanitize)
- XSS prevention with React's built-in escaping
- CSRF protection via SameSite cookies

### API Security

- API keys stored in environment variables
- Domain restrictions for API-Football key
- Rate limiting
- Error message sanitization

## Performance Optimizations

### Frontend Optimizations

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Static Generation**: Pre-render static pages
- **Incremental Static Regeneration**: Update static pages on demand
- **React Query Caching**: Reduce API calls
- **Lazy Loading**: Load components on demand

### Backend Optimizations

- **Firestore Indexes**: Optimized queries
- **Cloud Function Optimization**: Cold start mitigation
- **CDN Caching**: Static assets via Firebase Hosting
- **Batch Operations**: Reduce Firestore writes

## Deployment Architecture

### Build Process

1. Next.js builds static assets and server functions
2. TypeScript compiles to JavaScript
3. Assets optimized and bundled
4. Static pages pre-rendered

### Deployment Flow

```
Local Development → Build → Firebase Hosting → CDN
                      │
                      │
                 Cloud Functions → Deploy
```

### Environment Management

- Development: `.env.local`
- Production: Firebase environment config
- Staging: Separate Firebase project (optional)

## Monitoring & Logging

### Client-Side Logging

- Console logging in development
- Error boundaries for error handling
- React Query DevTools for debugging

### Server-Side Logging

- Cloud Functions logs
- Firestore audit logs
- Firebase Analytics (optional)

## Future Enhancements

- Real-time notifications
- PWA support
- Offline mode with service workers
- Advanced analytics
- Social features (sharing, friends)
- Tournament system
- Mobile app (React Native)
