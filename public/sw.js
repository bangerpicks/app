const CACHE = 'banger-picks-shell-v6'
const PRECACHE = ['/', '/my-games/', '/picks/', '/rankings/', '/discover/', '/shop/', '/manifest.json']
const NAV_PATHS = new Set(PRECACHE)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

function normalizePath(pathname) {
  if (pathname === '/' || pathname === '') return '/my-games/'
  if (pathname === '/dashboard' || pathname === '/dashboard/') return '/my-games/'
  if (pathname === '/competitions' || pathname === '/competitions/') return '/my-games/'
  if (!pathname.endsWith('/')) return `${pathname}/`
  return pathname
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      })
    )
    return
  }

  if (event.request.mode === 'navigate') {
    const path = normalizePath(url.pathname)
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(path)
        const network = fetch(event.request)
          .then((response) => {
            if (response.ok && NAV_PATHS.has(path)) {
              cache.put(path, response.clone())
            }
            return response
          })
          .catch(() => null)
        if (cached) {
          event.waitUntil(network)
          return cached
        }
        const fresh = await network
        if (fresh) return fresh
        return cache.match('/my-games/') || Response.error()
      })
    )
  }
})