'use client'

import { useLocale } from 'next-intl'
import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter, routing } from '@/i18n/routing'

const FLAG = { it: '🇮🇹', en: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸' }
const NAME = { it: 'Italiano', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español' }

export default function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname() // percorso SENZA prefisso lingua
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
    // next-intl imposta il cookie NEXT_LOCALE e naviga alla stessa pagina
    // nella nuova lingua (aggiunge/toglie il prefisso da solo).
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
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
          background: 'transparent', border: '1px solid rgba(0,0,0,0.15)',
          font: 'inherit', lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 18 }}>{FLAG[locale]}</span>
        <span style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>{locale}</span>
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
                <span style={{ fontSize: 18 }}>{FLAG[l]}</span>
                <span>{NAME[l]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
