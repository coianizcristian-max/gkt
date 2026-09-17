'use client'

import DemoEntra from '@/app/components/DemoEntra'

import { useState, useEffect } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import StagioneSwitcher from '@/app/components/StagioneSwitcher'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

function MobileNavLink({ href, children, onClick, extraClass = '' }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link href={href} className={`mob-nav-link ${active ? 'active' : ''} ${extraClass}`} onClick={onClick}>
      {children}
    </Link>
  )
}

export default function SidebarMobile({ voci, brand, demoLabel }) {
  const c = useTranslations('common')
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Chiudi al cambio pagina
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <div className="mob-header">
      <Link href={brand.href} className="mob-brand">
        {brand.logo
          ? <img src={brand.logo} alt="" className="brand-logo" />
          : <div className="glove">GK</div>}
        <div>
          <b>{brand.isStaff ? 'GKSeason' : (brand.societa || 'GKSeason')}</b>
          {!brand.isStaff && brand.stagioneNome && <span>{brand.stagioneNome}</span>}
        </div>
      </Link>
      {brand.isStaff && (
        <div className="brand-switcher-wrap" style={{ margin: '-6px 0 0 0' }}>
          <StagioneSwitcher stagioni={brand.altreStagioni ?? []} stagioneCorrenteId={brand.stagioneId} />
        </div>
      )}
      <button
        type="button"
        className={`hamburger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
      >
        <span /><span /><span />
      </button>

      {open && (
        <>
          <div className="mob-overlay" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav className="mob-menu">
            <div className="mob-lang" style={{ padding: '4px 12px 8px' }}>
              <LanguageSwitcher />
            </div>
            {demoLabel && <DemoEntra label={demoLabel} className="mob-nav-link mob-nav-demo" />}
            {voci.map((v) =>
              v.type === 'divider' ? <div key={v.key} className="mob-divider" /> :
              v.type === 'signout' ? (
                <form key="signout" action="/auth/signout" method="post">
                  <button type="submit" className="mob-nav-link mob-signout">{c('esci')}</button>
                </form>
              ) : (
                <MobileNavLink key={v.href} href={v.href} onClick={() => setOpen(false)} extraClass={v.href === '/supervisore' ? 'mob-nav-link-supervisore' : ''}>
                  {v.label}
                </MobileNavLink>
              )
            )}
          </nav>
        </>
      )}
    </div>
  )
}
