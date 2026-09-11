'use client'

import { useLocale } from 'next-intl'
import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter, routing } from '@/i18n/routing'

const NAME = { it: 'Italiano', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español' }

// Bandiere disegnate in SVG (le emoji-bandiera NON si vedono su Chrome/Windows).
function Flag({ code, size = 22 }) {
  const common = {
    width: size, height: Math.round(size * 0.68), preserveAspectRatio: 'none',
    style: { borderRadius: 2, display: 'block', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)', flexShrink: 0 },
  }
  switch (code) {
    case 'it':
      return (
        <svg viewBox="0 0 3 2" {...common} aria-hidden="true">
          <rect width="1" height="2" fill="#009246" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#ce2b37" />
        </svg>
      )
    case 'de':
      return (
        <svg viewBox="0 0 5 3" {...common} aria-hidden="true">
          <rect width="5" height="1" fill="#000000" />
          <rect y="1" width="5" height="1" fill="#dd0000" />
          <rect y="2" width="5" height="1" fill="#ffce00" />
        </svg>
      )
    case 'es':
      return (
        <svg viewBox="0 0 3 2" {...common} aria-hidden="true">
          <rect width="3" height="2" fill="#aa151b" />
          <rect y="0.5" width="3" height="1" fill="#f1bf00" />
        </svg>
      )
    case 'en': // Regno Unito (Union Jack)
      return (
        <svg viewBox="0 0 60 30" {...common} aria-hidden="true">
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" strokeWidth="2.5" />
          <path d="M30,0 V30 M0,15 H60" stroke="#ffffff" strokeWidth="10" />
          <path d="M30,0 V30 M0,15 H60" stroke="#c8102e" strokeWidth="6" />
        </svg>
      )
    default:
      return null
  }
}

export default function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function change(next) {
    setOpen(false)
    if (next === locale) return
    fetch('/api/set-lingua', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lingua: next }) }).catch(() => {})
    router.replace(pathname, { locale: next })
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Cambia lingua"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '5px 8px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(128,128,128,0.16)', border: '1px solid rgba(128,128,128,0.45)', lineHeight: 0,
        }}
      >
        <Flag code={locale} size={24} />
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)', margin: 0,
            padding: 6, listStyle: 'none', minWidth: 160, zIndex: 1000,
            background: '#fff', borderRadius: 10,
            boxShadow: '0 8px 28px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {routing.locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => change(l)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: l === locale ? 'rgba(10,90,138,0.08)' : 'transparent',
                  border: 'none', font: 'inherit', textAlign: 'left',
                  fontWeight: l === locale ? 700 : 500,
                }}
              >
                <Flag code={l} size={22} />
                <span>{NAME[l]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
