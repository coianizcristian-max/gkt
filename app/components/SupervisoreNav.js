'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const VOCI = [
  { href: '/supervisore', label: 'Sito' },
  { href: '/supervisore/stagioni', label: 'Stagioni' },
  { href: '/supervisore/categorie', label: 'Categorie' },
  { href: '/supervisore/elenchi', label: 'Elenchi' },
  { href: '/supervisore/inviti', label: 'Inviti' },
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
