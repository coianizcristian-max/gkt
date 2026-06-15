import { Barlow, Inter } from 'next/font/google'
import './globals.css'

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
  title: 'GKT — Portieri Azzurra Sandrigo',
  description: 'Gestione allenamenti e valutazioni dei portieri',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={`${barlow.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
