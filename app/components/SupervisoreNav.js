'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const VOCI = [
  { href: '/supervisore', label: 'Sito' },
  { href: '/supervisore/anni', label: 'Anni disponibili' },
  { href: '/supervisore/attributi', label: 'Attributi' },
  { href: '/supervisore/elenchi', label: 'Elenchi' },
  { href: '/supervisore/funzionalita', label: 'Funzionalità' },
  { href: '/supervisore/faq', label: 'FAQ' },
  { href: '/supervisore/abbonamenti', label: 'Abbonamenti' },
  { href: '/supervisore/coupon', label: 'Coupon' },
  { href: '/supervisore/newsletter', label: 'Newsletter' },
  { href: '/supervisore/metriche', label: 'Metriche' },
  { href: '/supervisore/webinar', label: 'Webinar' },
  { href: '/supervisore/versioni', label: 'Versioni' },
]

export default function SupervisoreNav() {
  const pathname = usePathname()
  return (
    <div className="sub-nav">
      {VOCI.map((v) => (
        <Link key={v.href} href={v.href}
          className={`sub-nav-link ${pathname === v.href ? 'active' : ''}`}>
          {v.label}
        </Link>
      ))}
    </div>
  )
}
