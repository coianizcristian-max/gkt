'use client'

import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'

const VOCI = [
  { href: '/supervisore', key: 'navSito' },
  { href: '/supervisore/anni', key: 'navAnni' },
  { href: '/supervisore/attributi', key: 'navAttributi' },
  { href: '/supervisore/elenchi', key: 'navElenchi' },
  { href: '/supervisore/faq', key: 'navFaq' },
  { href: '/supervisore/abbonamenti', key: 'navAbbonamenti' },
  { href: '/supervisore/coupon', key: 'navCoupon' },
  { href: '/supervisore/newsletter', key: 'navNewsletter' },
  { href: '/supervisore/metriche', key: 'navMetriche' },
  { href: '/supervisore/webinar', key: 'navWebinar' },
  { href: '/supervisore/versioni', key: 'navVersioni' },
]

export default function SupervisoreNav() {
  const pathname = usePathname()
  const t = useTranslations('supervisore')
  return (
    <div className="sub-nav">
      {VOCI.map((v) => (
        <Link key={v.href} href={v.href}
          className={`sub-nav-link ${pathname === v.href ? 'active' : ''}`}>
          {t(v.key)}
        </Link>
      ))}
    </div>
  )
}
