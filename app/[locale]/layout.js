import { Barlow, Inter } from 'next/font/google'
import '../globals.css'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import PostHogProvider from '@/app/components/PostHogProvider'
import CookieBanner from '@/app/components/CookieBanner'
import MetaPixel from '@/app/components/MetaPixel'
import AttribuzioneUtm from '@/app/components/AttribuzioneUtm'
import PwaInstaller from '@/app/components/PwaInstaller'

const barlow = Barlow({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' })
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })

const BASE = 'https://www.gkseason.it'
const OG_LOCALE = { it: 'it_IT', en: 'en_GB', de: 'de_DE', es: 'es_ES' }

// Pre-genera le pagine per ogni lingua attiva (rendering statico).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  const path = locale === routing.defaultLocale ? '' : `/${locale}`

  return {
    metadataBase: new URL(BASE),
    other: { 'facebook-domain-verification': 'iv44yskhavej225hs3k6o4wz8mnz23' },
    title: { default: t('title'), template: '%s | GKSeason' },
    description: t('description'),
    keywords: ['preparatore portieri', 'allenatore portieri', 'scuola portieri', 'gestione allenamenti calcio', 'valutazioni portiere', 'statistiche portiere calcio'],
    authors: [{ name: 'GKSeason' }],
    applicationName: 'GKSeason',
    formatDetection: { telephone: false },
    manifest: '/manifest.json',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: 'GKSeason' },
    // hreflang: dice a Google che esistono le versioni in lingua della home.
    // Le pagine pubbliche profonde (es. /allenatori/[id]) portano il proprio
    // hreflang via sitemap.js.
    alternates: {
      canonical: `${BASE}${path}`,
      languages: {
        it: BASE,
        en: `${BASE}/en`,
        de: `${BASE}/de`,
        es: `${BASE}/es`,
        'x-default': BASE,
      },
    },
    openGraph: {
      type: 'website',
      locale: OG_LOCALE[locale] || 'it_IT',
      siteName: t('ogSiteName'),
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: `${BASE}${path}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description: t('ogDescription'),
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    icons: { icon: '/icon.svg' },
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a5a8a',
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  // Abilita il rendering statico per questa lingua.
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${barlow.variable} ${inter.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PostHogProvider>{children}</PostHogProvider>
          <CookieBanner />
          <MetaPixel />
          <AttribuzioneUtm />
          <PwaInstaller />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
