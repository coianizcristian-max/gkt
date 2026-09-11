import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.js')

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
      {
        source: '/registrati',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
