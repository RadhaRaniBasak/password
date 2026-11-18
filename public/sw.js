// Keeps the app usable offline. Pages are fetched fresh when online, with the cache as fallback;
// everything else is content-hashed by the build, so a cached copy is always the right one.
const CACHE = 'password-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// The page sends the files its first visit loaded before this worker was in control.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache') return
  event.waitUntil(
    caches.open(CACHE).then((cache) => Promise.all(event.data.urls.map((url) => cache.add(url).catch(() => {})))),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  const save = (response) => {
    if (response.ok) {
      const copy = response.clone()
      caches.open(CACHE).then((cache) => cache.put(request, copy))
    }
    return response
  }

  // Assets answer with "Vary: Origin", but scripts and fonts send an Origin header while the cached copies were
  // fetched without one. The bytes are identical (same origin, content-hashed), so match on the URL alone.
  const cached = (key) => caches.match(key, { ignoreVary: true })

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(save).catch(() => cached(request).then((page) => page ?? cached('/'))))
    return
  }

  event.respondWith(cached(request).then((file) => file ?? fetch(request).then(save)))
})
