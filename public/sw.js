// GKT Service Worker — cache-first per risorse statiche, network-first per API
const CACHE_NAME = 'gkt-v2'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // API Supabase e route /api/* → sempre network, mai cache
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) {
    return
  }

  // Risorse statiche (_next/static) → cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
          return res
        })
      )
    )
    return
  }

  // Pagine app → network-first con fallback cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
