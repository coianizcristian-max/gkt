'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import AreaLoginCta from '@/app/components/AreaLoginCta'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

export default function MobileNav({ links }) {
  const c = useTranslations('common')
  const [aperto, setAperto] = useState(false)

  return (
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label={aperto ? c('chiudiMenu') : c('apriMenu')}
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
          <div className="mobile-nav-lang" style={{ marginTop: 8 }}>
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </div>
  )
}
