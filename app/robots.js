export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/cerca-allenatori', '/allenatori/', '/login', '/registrati', '/newsletter'],
        disallow: ['/api/', '/portieri', '/calendario', '/partite', '/statistiche', '/supervisore', '/profilo', '/inviti', '/esercizi', '/ricorrenze', '/abbonati', '/suggerimenti', '/archivio', '/come-iniziare'],
      },
    ],
    sitemap: 'https://gkt2026.vercel.app/sitemap.xml',
  }
}
