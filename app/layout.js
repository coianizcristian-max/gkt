import { Barlow, Inter } from 'next/font/google'
import './globals.css'
import PostHogProvider from '@/app/components/PostHogProvider'
import CookieBanner from '@/app/components/CookieBanner'
import PwaInstaller from '@/app/components/PwaInstaller'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
})
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata = {
  metadataBase: new URL('https://gkt2026.vercel.app'),
  title: {
    default: 'GKSeason — Gestionale Allenamento Portieri',
    template: '%s | GKSeason',
  },
  description: 'GKSeason è la piattaforma per allenatori di portieri: calendario allenamenti, valutazioni, statistiche, esercizi e gestione squadra in un\'unica app. Trova un preparatore portieri vicino a te.',
  keywords: ['preparatore portieri', 'allenatore portieri', 'scuola portieri', 'gestione allenamenti calcio', 'valutazioni portiere', 'statistiche portiere calcio'],
  authors: [{ name: 'GKSeason' }],
  applicationName: 'GKSeason',
  formatDetection: { telephone: false },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GKSeason',
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: 'GKSeason — Gestionale Allenamento Portieri',
    title: 'GKSeason — Gestionale Allenamento Portieri',
    description: 'La piattaforma per allenatori di portieri: calendario, valutazioni, statistiche ed esercizi in un\'unica app.',
    url: 'https://gkt2026.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GKSeason — Gestionale Allenamento Portieri',
    description: 'La piattaforma per allenatori di portieri: calendario, valutazioni, statistiche ed esercizi in un\'unica app.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: '/icon.svg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a5a8a',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={`${barlow.variable} ${inter.variable}`}>
      <body><PostHogProvider>{children}</PostHogProvider><CookieBanner /><PwaInstaller /></body>
    </html>
  )
}
