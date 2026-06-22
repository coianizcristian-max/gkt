'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const VOCI = [
  { href: '/supervisore', label: 'Sito' },
  { href: '/supervisore/stagioni', label: 'Stagioni' },
  { href: '/supervisore/categorie', label: 'Categorie' },
  { href: '/supervisore/attributi', label: 'Attributi' },
  { href: '/supervisore/elenchi', label: 'Elenchi' },
  { href: '/supervisore/inviti', label: 'Inviti' },
  { href: '/supervisore/funzionalita', label: 'Funzionalità' },
  { href: '/supervisore/abbonamenti', label: 'Abbonamenti' },
  { href: '/supervisore/coupon', label: 'Coupon' },
  { href: '/supervisore/newsletter', label: 'Newsletter' },
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
