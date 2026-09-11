export default function robots() {
  const priv = ['/portieri', '/calendario', '/partite', '/statistiche', '/supervisore', '/profilo', '/inviti', '/esercizi', '/ricorrenze', '/abbonati', '/suggerimenti', '/archivio', '/come-iniziare']
  const pub = ['/', '/cerca-allenatori', '/allenatori/', '/login', '/registrati', '/newsletter']
  const otherLocales = ['en', 'de']
  const prefixed = (arr) =>
    otherLocales.flatMap((l) => arr.map((p) => `/${l}${p === '/' ? '' : p}`))

  return {
    rules: [
      {
        userAgent: '*',
        allow: [...pub, ...prefixed(pub)],
        disallow: ['/api/', ...priv, ...prefixed(priv)],
      },
    ],
    sitemap: 'https://www.gkseason.it/sitemap.xml',
  }
}
