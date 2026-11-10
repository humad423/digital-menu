// Bump VERSION to drop every cache from older releases.
const VERSION = 'v6'
const STATIC_CACHE = `alfsouq-static-${VERSION}`
const PAGE_CACHE = `alfsouq-pages-${VERSION}`
const IMAGE_CACHE = `alfsouq-images-${VERSION}`
const OFFLINE_URL = '/offline.html'
const MAX_PAGES = 20
const MAX_IMAGES = 80

// Signed-in areas and APIs always go to the network and are never stored
const PRIVATE_PATHS = ['/admin', '/dashboard', '/restaurant-panel', '/api', '/auth', '/login']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icon-192.png', '/partner-icon-192.png']))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  const current = [STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE]
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => !current.includes(name)).map((name) => caches.delete(name))))
      .then(() => self.registration.navigationPreload?.enable())
      .then(() => self.clients.claim())
  )
})

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)))
}

// Fresh content whenever online. A saved copy only appears when there is no connection.
async function pageResponse(event, isPrivate) {
  try {
    const response = (await event.preloadResponse) || (await fetch(event.request))
    if (response.ok && !isPrivate) {
      const copy = response.clone()
      caches.open(PAGE_CACHE)
        .then((cache) => cache.put(event.request, copy))
        .then(() => trimCache(PAGE_CACHE, MAX_PAGES))
    }
    return response
  } catch {
    const saved = isPrivate ? null : await caches.match(event.request, { cacheName: PAGE_CACHE })
    return saved || caches.match(OFFLINE_URL)
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName })
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const copy = response.clone()
    caches.open(cacheName).then((cache) => cache.put(request, copy))
  }
  return response
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request, { cacheName: IMAGE_CACHE })
  const refresh = fetch(request).then((response) => {
    if (response.ok || response.type === 'opaque') {
      const copy = response.clone()
      caches.open(IMAGE_CACHE)
        .then((cache) => cache.put(request, copy))
        .then(() => trimCache(IMAGE_CACHE, MAX_IMAGES))
    }
    return response
  })
  return cached || refresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin
  const isPrivate = sameOrigin && PRIVATE_PATHS.some((path) => url.pathname.startsWith(path))

  if (request.mode === 'navigate') {
    event.respondWith(pageResponse(event, isPrivate))
    return
  }

  if (url.hostname === 'res.cloudinary.com') {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Build files have a hash in their name, so a stored copy can never be out of date
  if (sameOrigin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
  }
})

// An offer notification sent from the admin panel
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {}
  event.waitUntil(self.registration.showNotification(data.title || 'ألف سوق', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    data: { url: data.url || '/' },
  }))
})

// Opens the page the notification is about, reusing an open window when there is one. Only pages on this site.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin)
  if (target.origin !== self.location.origin) return
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find((client) => client.url.startsWith(self.location.origin))
    if (open) {
      await open.navigate(target.href).catch(() => {})
      return open.focus()
    }
    return self.clients.openWindow(target.href)
  })())
})
