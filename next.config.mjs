import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.js')

// CSP allow-list dei servizi usati da GKSeason. Permissiva su inline (Next + pixel
// lo richiedono), ma vincola le origini. Dopo il deploy controlla la console per
// eventuali "Refused to..." e aggiungi qui il dominio mancante.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  // Google Ads (gtag.js): script da googletagmanager.com; i ping di conversione
  // vanno a google.com / google.it / googleadservices.com / googleads.g.doubleclick.net
  // (come immagine o fetch); td.doubleclick.net e' l'iframe del conversion linker.
  "img-src 'self' data: blob: https://*.supabase.co https://www.facebook.com https://*.hcaptcha.com https://www.google.com https://www.google.it https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.googletagmanager.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https://*.hcaptcha.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://eu.i.posthog.com https://eu-assets.i.posthog.com https://js.stripe.com https://*.hcaptcha.com https://hcaptcha.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://eu.i.posthog.com https://eu-assets.i.posthog.com https://api.stripe.com https://*.hcaptcha.com https://challenges.cloudflare.com https://connect.facebook.net https://www.facebook.com https://nominatim.openstreetmap.org https://www.google.com https://www.google.it https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.googletagmanager.com https://pagead2.googlesyndication.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.hcaptcha.com https://hcaptcha.com https://challenges.cloudflare.com https://td.doubleclick.net https://www.googletagmanager.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Content-Security-Policy', value: csp },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/registrati', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' }] },
      // Landing degli annunci: fuori dai motori di ricerca (sono pagine a
      // pagamento, duplicherebbero la home). AdsBot di Google le legge comunque.
      { source: '/lp/:slug', headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }] },
      { source: '/:locale(en|de|es)/lp/:slug', headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }] },
    ]
  },
  // Scorciatoia pubblica per i QR code: /d resta stabile per sempre, la
  // destinazione la cambi qui senza dover ristampare nulla.
  // NB: 'permanent: false' e' voluto (302). Con un 301 i browser cachiano
  // il redirect e non riusciresti piu' a spostarlo.
  async redirects() {
    return [
      { source: '/d', destination: '/api/ospite', permanent: false },
    ]
  },
}

export default withNextIntl(nextConfig)
