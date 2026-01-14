import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to redirect direct /dashboard loads to / to prevent router initialization issues.
 * 
 * NOTE: This middleware will NOT work with `output: 'export'` (static export).
 * For static exports, use Firebase Hosting redirects in firebase.json instead.
 * 
 * To use this middleware:
 * 1. Remove `output: 'export'` from next.config.js
 * 2. Deploy with server-side rendering enabled
 * 
 * Current setup uses Firebase Hosting redirect (see firebase.json) which works with static exports.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Redirect direct /dashboard loads to / to prevent router initialization issues
  // This ensures router always initializes at /, then redirects to /dashboard
  // This prevents the infinite replaceState loop that occurs on direct /dashboard loads
  if (pathname === '/dashboard') {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Only run middleware on /dashboard path
export const config = {
  matcher: '/dashboard',
}
