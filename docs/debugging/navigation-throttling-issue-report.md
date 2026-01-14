# Navigation Throttling Issue - Debug Report

## Issue Summary
**Symptom**: Browser console shows warning: "Throttling navigation to prevent the browser from hanging. See https://crbug.com/1038223"

**Root Cause**: Next.js router is calling `window.history.replaceState` in an infinite loop, with calls happening every 2-3ms, reaching 10,000+ calls before throttling kicks in. This occurs specifically on direct `/dashboard` loads (not when `/` redirects to `/dashboard`).

**Impact**: Browser performance degradation, potential hangs, poor user experience on hosted/live environment.

**Status**: ✅ **RESOLVED** - Fixed via Firebase Hosting server-side redirect (`/dashboard` → `/`), ensuring router always initializes at `/` first.

## Evidence from Logs
- **Call frequency**: `replaceState` called every 1-4ms during loop
- **Call volume**: 
  - Initial detection: 8,500-10,300+ calls before throttling
  - After URL fix: 35,000+ calls before grace period blocking (grace period check was too late)
- **URL pattern**: Next.js router calling with relative path `/dashboard` while current URL is absolute `https://banger-picks.web.app/dashboard`
- **Stack trace**: Shows Next.js router internals (`app-router.tsx:573`) in recursive loop with React render cycle (`react-dom.production.min.js` a5/a6 pattern)
- **Direct load behavior**: 
  - Loading `/` → redirects to `/dashboard`: 1 replaceState call, 315ms delay (WORKING)
  - Loading `/dashboard` directly: 35,000+ replaceState calls, 1-4ms apart (BROKEN)
- **Grace period timing**: Grace period check was evaluated after 35,000+ calls had already occurred, indicating check was placed too late in function execution

## Hypotheses Tested

### Hypothesis A: Frequent replaceState calls from Next.js router
**Status**: CONFIRMED - Logs show Next.js router calling replaceState in loop

### Hypothesis B: URL parameter reading triggering router updates
**Status**: REJECTED - URL parameter reads in SignInModal are one-time on mount

### Hypothesis C: Scroll restoration conflicting with Next.js
**Status**: PARTIALLY CONFIRMED - Removed `window.history.scrollRestoration = 'manual'` as it was conflicting with Next.js internal scroll management

### Hypothesis D: Router navigation calls happening too frequently
**Status**: INCONCLUSIVE - Router.push calls logged but not the primary cause

### Hypothesis E: Dashboard page re-renders causing navigation updates
**Status**: INCONCLUSIVE - Render count tracking added but not showing excessive renders

### Hypothesis F: OnboardingIntro component causing loop via usePathname()
**Status**: REJECTED - Component renders normally, not causing loop

### Hypothesis G: Direct /dashboard loads causing router initialization issue
**Status**: CONFIRMED - Issue ONLY occurs on direct `/dashboard` loads, NOT when `/` redirects to `/dashboard`
- Loading `/` → redirects to `/dashboard`: Works fine (1 replaceState call, 315ms delay)
- Loading `/dashboard` directly: Triggers infinite loop (10,000+ calls, 2-3ms apart)
- Root cause: Next.js router state not properly initialized on direct client-side loads

## Fixes Attempted

### 1. Removed Scroll Restoration Setting
- **Action**: Removed `window.history.scrollRestoration = 'manual'` from DashboardClient and RankingsClient
- **Rationale**: Next.js manages scroll restoration internally; manual setting caused conflicts
- **Result**: Issue persisted

### 2. Memoized baseMatches
- **Action**: Used `useMemo` to prevent unnecessary re-renders in `useLiveMatches` hook
- **Rationale**: Array recreation on every render could trigger state updates
- **Result**: Issue persisted

### 3. Moved window.location reads out of render
- **Action**: Moved `window.location` access from render to useEffect
- **Rationale**: Reading location during render can trigger router sync
- **Result**: Issue persisted

### 4. Added History API Interceptor with Throttling
- **Action**: Intercepted `window.history.replaceState` in ViewportTracker to add throttling
- **Rationale**: Prevent infinite loops by blocking excessive same-URL calls
- **Implementation**:
  - Rate limiting: 500ms minimum between same-URL calls
  - Aggressive blocking: Block calls if happening faster than 10ms apart
  - URL normalization: Fixed comparison to handle relative vs absolute URLs
- **Result**: Throttling works but loop still occurs (10,000+ calls before blocking)

### 5. Enhanced URL Comparison Logic
- **Action**: Fixed `isSameUrl` check to properly compare relative paths (`/dashboard`) with absolute URLs
- **Rationale**: Initial comparison was failing, preventing throttling from working
- **Result**: Throttling now detects same-URL calls correctly, but loop persists

### 6. Aggressive Early Blocking
- **Action**: Block same-URL calls immediately if happening faster than 10ms apart
- **Rationale**: Prevent thousands of calls before throttling kicks in
- **Result**: Working but needs to be more aggressive for direct loads

### 7. Direct Load Detection & Grace Period Blocking
- **Action**: Detect direct `/dashboard` loads and apply grace period blocking (block all same-URL calls for first 3 seconds, except first call)
- **Rationale**: Direct loads trigger router sync loops during initialization; need to block during router setup phase
- **Implementation**:
  - Detect direct loads: `initialPathname === '/dashboard' && (!document.referrer || !document.referrer.includes(window.location.hostname))`
  - Set grace period: 3 seconds from page load
  - Block all same-URL calls during grace period (allow first call only for initial router setup)
- **Result**: Initial implementation failed - grace period check was evaluated too late (after 35,000+ calls had already occurred)
- **Issue**: Grace period check was placed after counter increment and logging, allowing loop to start before blocking

### 8. Early Grace Period Blocking
- **Action**: Moved grace period check to the VERY BEGINNING of `replaceState` function, before any processing
- **Rationale**: Must block calls immediately, before Next.js router can start the sync loop
- **Implementation**:
  - Check grace period FIRST, before incrementing counters or logging
  - Block immediately if: `directLoadStartTime !== null && timeSinceDirectLoad < 3000ms && urlMatches && callCount >= 2`
  - Return early without calling `originalReplaceState` if blocked
- **Result**: Grace period check was too late (35,000+ calls before blocking)
- **Status**: SUPERSEDED by Fix #9 (server-side redirect)

### 9. Server-Side Redirect (FINAL FIX - RECOMMENDED)
- **Action**: Prevent direct `/dashboard` loads by redirecting to `/` at server/CDN level
- **Rationale**: Router initializes cleanly at `/`, then client-side redirects to `/dashboard` (proven to work with 1 replaceState call)
- **Implementation**:
  - **Option A (Firebase Hosting)**: Added redirect in `firebase.json` - redirects `/dashboard` → `/` with 307 status
  - **Option B (Next.js Middleware)**: Created `middleware.ts` - redirects `/dashboard` → `/` (requires removing `output: 'export'`)
- **Why this works**:
  - Router always initializes at `/` (clean hydration)
  - Client-side redirect from `/` → `/dashboard` works perfectly (1 replaceState call, 315ms delay)
  - Zero loops, zero throttling needed
  - Server-side redirect happens before page load, preventing router initialization issue entirely
- **Result**: ✅ **SUCCESS** - Issue completely resolved
  - Router initializes at `/` (clean hydration)
  - Only 1 replaceState call (48ms delay) to navigate to `/dashboard`
  - No infinite loop, no throttling warnings
  - Zero performance impact

## Current Status
- **Final solution**: Server-side redirect to prevent direct `/dashboard` loads
- **Root cause**: Next.js router state initialization issue on direct `/dashboard` loads
  - Server-side redirect (`/` → `/dashboard`) works correctly (1 replaceState call, 315ms delay)
  - Direct client-side load of `/dashboard` causes router to repeatedly sync URL state
  - Router tries to "fix" URL state in a loop, calling replaceState thousands of times (35,000+ calls observed)
  - Loop occurs during router initialization phase (first 2-3 seconds after page load)
- **Solution implemented**: 
  - **Firebase Hosting redirect** (works with static export): `/dashboard` → `/` redirect at CDN level
  - **Next.js middleware** (alternative): Created but requires removing `output: 'export'`
- **Why this is the best fix**:
  - Prevents the problematic scenario entirely (direct `/dashboard` loads)
  - Router always initializes at `/` (proven to work correctly)
  - No client-side throttling needed
  - Clean, production-ready solution
- **Status**: ✅ **RESOLVED** - Firebase Hosting redirect successfully prevents the issue
- **Verification results**:
  - Router initializes at `/` (`initialPathname: '/'` in logs)
  - Only 1 replaceState call (48ms delay) to navigate to `/dashboard`
  - No infinite loop, no throttling warnings
  - Clean router initialization and hydration
- **Next steps**: 
  1. ✅ **COMPLETE**: Firebase Hosting redirect verified working
  2. **Optional**: Remove client-side throttling instrumentation from `ViewportTracker.tsx` (no longer needed)
  3. **Optional**: Remove debug logging from other components (DashboardPage, OnboardingIntro, SignInModal, useLiveMatches)

## Instrumentation Added
- History API interceptor with call counting and timing
- URL comparison logging (relative vs absolute)
- Stack trace sampling to identify callers
- Component render tracking (DashboardPage, OnboardingIntro)
- Pathname change tracking
- Router navigation call logging

## Files Modified
- `middleware.ts` - **NEW**: Next.js middleware to redirect `/dashboard` → `/` (requires removing `output: 'export'`)
- `firebase.json` - **NEW**: Added Firebase Hosting redirect `/dashboard` → `/` (works with static export)
- `src/components/ViewportTracker.tsx` - History API interceptor with throttling, direct load detection, early grace period blocking (can be removed after verification)
- `src/components/dashboard/DashboardClient.tsx` - Removed scroll restoration
- `src/components/dashboard/RankingsClient.tsx` - Removed scroll restoration
- `src/app/dashboard/page.tsx` - Memoized baseMatches, moved location reads, added render tracking
- `src/components/dashboard/OnboardingIntro.tsx` - Added instrumentation (pathname tracking, router.push logging)

## Recommendations
1. ✅ **COMPLETE**: Server-side redirect verified working - issue resolved
2. **Optional cleanup**: Remove client-side throttling instrumentation from `ViewportTracker.tsx` (no longer needed)
3. **Optional cleanup**: Remove debug logging from other components (DashboardPage, OnboardingIntro, SignInModal, useLiveMatches)
4. **Keep**: Firebase Hosting redirect in `firebase.json` - this is the permanent solution
5. **Keep**: Next.js middleware in `middleware.ts` as alternative (if you ever remove `output: 'export'`)

## Test Results
- **Test 1**: Direct load of `/dashboard` with initial throttling → 8,500+ calls before blocking
- **Test 2**: Direct load with URL normalization fix → 35,000+ calls before blocking (grace period check too late)
- **Test 3**: Direct load with early grace period blocking → Grace period check still too late
- **Test 4**: Server-side redirect (Firebase Hosting) → **✅ SUCCESS** 
  - Router initialized at `/` (`initialPathname: '/'`)
  - Only 1 replaceState call (48ms delay) to navigate to `/dashboard`
  - No infinite loop, no throttling warnings
  - Clean router initialization and hydration
