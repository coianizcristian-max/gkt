'use client'

import { useState } from 'react'
import AreaLoginCta from '@/app/components/AreaLoginCta'

export default function MobileNav({ links }) {
  const [aperto, setAperto] = useState(false)

  return (
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label={aperto ? 'Chiudi menu' : 'Apri menu'}
        aria-expanded={aperto}
        onClick={() => setAperto((v) => !v)}
      >
        {aperto ? '✕' : '☰'}
      </button>

      {aperto && (
        <div className="mobile-nav-panel">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setAperto(false)}>{l.label}</a>
          ))}
          <div className="mobile-nav-login">
            <AreaLoginCta variant="nav" />
          </div>
        </div>
      )}
    </div>
  )
}
