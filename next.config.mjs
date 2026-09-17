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
  "img-src 'self' data: blob: https://*.supabase.co https://www.facebook.com https://*.hcaptcha.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https://*.hcaptcha.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://eu.i.posthog.com https://eu-assets.i.posthog.com https://js.stripe.com https://*.hcaptcha.com https://hcaptcha.com https://challenges.cloudflare.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://eu.i.posthog.com https://eu-assets.i.posthog.com https://api.stripe.com https://*.hcaptcha.com https://challenges.cloudflare.com https://connect.facebook.net https://www.facebook.com https://nominatim.openstreetmap.org",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.hcaptcha.com https://hcaptcha.com https://challenges.cloudflare.com",
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
    ]
  },
}

export default withNextIntl(nextConfig)
