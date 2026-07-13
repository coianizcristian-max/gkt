'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavLink({ href, children, extraClass = '' }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link href={href} className={`nav-link ${active ? 'active' : ''} ${extraClass}`}>
      {children}
    </Link>
  )
}
