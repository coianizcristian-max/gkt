'use client'

import DemoEntra from '@/app/components/DemoEntra'

import { useState, useEffect } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { trackEvento } from '@/app/components/PostHogProvider'
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

  const [nascosto, setNascosto] = useState(false)

  // Chiudi al cambio pagina
  useEffect(() => { setOpen(false) }, [pathname])

  // Solo mobile (la barra esiste solo li'): si nasconde scorrendo verso il
  // basso e ricompare appena si scorre verso l'alto. In cima alla pagina e col
  // menu aperto e' sempre visibile. Cosi' il contenuto ha piu' spazio, cosa
  // che conta soprattutto nel browser di Instagram che ha gia' la sua barra.
  useEffect(() => {
    let ultimo = window.scrollY
    let inCoda = false
    const aggiorna = () => {
      inCoda = false
      const y = window.scrollY
      if (y < 80) setNascosto(false)
      else if (y > ultimo + 6) setNascosto(true)
      else if (y < ultimo - 6) setNascosto(false)
      else return // movimento minimo: non aggiorno il riferimento
      ultimo = y
    }
    const suScroll = () => {
      if (inCoda) return
      inCoda = true
      requestAnimationFrame(aggiorna)
    }
    window.addEventListener('scroll', suScroll, { passive: true })
    return () => window.removeEventListener('scroll', suScroll)
  }, [])
  useEffect(() => { setNascosto(false) }, [pathname])

  function apriChiudi() {
    if (!open) trackEvento('menu_mobile_aperto', { pagina: pathname })
    setOpen(!open)
  }

  return (
    <div className={`mob-header ${nascosto && !open ? 'mob-header-nascosto' : ''}`}>
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
      {/* Icona + scritta "Menu": l'icona da sola non tutti la riconoscono */}
      <button
        type="button"
        className="mob-menu-btn"
        onClick={apriChiudi}
        aria-label={open ? c('chiudiMenu') : c('apriMenu')}
        aria-expanded={open}
      >
        <span className={`hamburger ${open ? 'open' : ''}`} aria-hidden="true">
          <span /><span /><span />
        </span>
        <span className="mob-menu-label">{c('menu')}</span>
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
