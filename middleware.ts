import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Intentionally a no-op.
 *
 * An older redirect (`/dashboard` → `/`) was added to work around static-export
 * hydration issues. In `next dev` that middleware still runs, sends users to `/`
 * (which only renders "Loading..."), and relies on a client `router.replace` to
 * bounce back — which sometimes never completes, leaving the app stuck.
 *
 * Production static export already serves `/dashboard/index.html` correctly
 * (see trailingSlash + Firebase hosting). Do not reintroduce a dashboard→root redirect.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
