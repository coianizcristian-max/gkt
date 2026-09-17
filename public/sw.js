// GKT Service Worker — v4
// Gestisce SOLO la cache delle risorse statiche (script, stili, icone).
// Le navigazioni tra pagine NON vengono mai intercettate: viaggiano
// normalmente come su qualsiasi sito. Questo elimina alla radice i
// problemi di pagine "mezze morte" servite da cache/intercettazioni fallite.
const CACHE_NAME = 'gkt-v4'
const STATIC_ASSETS = [
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

  // Navigazioni tra pagine → MAI intercettate: gestione normale del browser
  if (e.request.mode === 'navigate') return

  // API e Supabase → sempre rete, mai cache
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) return

  // Risorse statiche di Next (hanno nomi univoci per versione: sicure da cachare).
  //
  // ATTENZIONE alla regola piu' importante di questo file: in cache ci va SOLO
  // una risposta valida. La versione precedente memorizzava qualunque risposta,
  // 404 compresi: se durante un deploy il browser chiedeva un file gia' rimosso,
  // l'errore restava in cache sotto quel nome e il sito si presentava senza CSS
  // finche' non si svuotava la cache a mano. Un ricaricamento non bastava.
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        // Una risposta valida gia' in cache si usa.
        if (cached && cached.ok) return cached

        // Altrimenti si va in rete, e si memorizza solo se la risposta e' buona.
        return fetch(e.request).then((res) => {
          if (res && res.ok && res.status === 200) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone)).catch(() => {})
          } else if (cached) {
            // Rete fallita o risposta non valida: meglio la copia vecchia del nulla.
            return cached
          }
          return res
        }).catch(() => cached || Response.error())
      })
    )
  }
  // Tutto il resto: gestione normale del browser (nessun respondWith)
})
