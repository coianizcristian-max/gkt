'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import StagioneSwitcher from '@/app/components/StagioneSwitcher'

function MobileNavLink({ href, children, onClick }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link href={href} className={`mob-nav-link ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </Link>
  )
}

export default function SidebarMobile({ voci, brand }) {
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
        <div className="brand-switcher-wrap" style={{ margin: '-6px 0 0 44px' }}>
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
            {voci.map((v) =>
              v.type === 'divider' ? <div key={v.key} className="mob-divider" /> :
              v.type === 'signout' ? (
                <form key="signout" action="/auth/signout" method="post">
                  <button type="submit" className="mob-nav-link mob-signout">Esci</button>
                </form>
              ) : (
                <MobileNavLink key={v.href} href={v.href} onClick={() => setOpen(false)}>
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
