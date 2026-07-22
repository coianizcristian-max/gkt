'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const CHIAVE = 'gkt-cookie-consent' // localStorage key

export function useCookieConsent() {
  // Ritorna 'accepted' | 'rejected' | null (non ancora scelto)
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CHIAVE)
}

export default function CookieBanner() {
  const [stato, setStato] = useState(null) // null | 'accepted' | 'rejected' | 'dettagli'
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const salvato = localStorage.getItem(CHIAVE)
    if (salvato) setStato(salvato)
  }, [])

  function accetta() {
    localStorage.setItem(CHIAVE, 'accepted')
    setStato('accepted')
    // Abilita PostHog se era stato bloccato
    if (typeof window !== 'undefined' && window.__posthogOptOut) {
      window.__posthogOptOut = false
    }
    // Notifica gli script di tracking (es. Meta Pixel) che il consenso è arrivato
    try { window.dispatchEvent(new Event('gkt-consenso-accettato')) } catch {}
  }

  function rifiuta() {
    localStorage.setItem(CHIAVE, 'rejected')
    setStato('rejected')
    // Blocca PostHog
    if (typeof window !== 'undefined') {
      window.__posthogOptOut = true
    }
  }

  // Non mostrare nulla durante SSR o se già scelto
  if (!mounted || stato === 'accepted' || stato === 'rejected') return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#14202b', color: '#fff',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
    }}>
      {stato === 'dettagli' ? (
        /* ── Vista dettagliata ── */
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: 16 }}>Gestisci le preferenze cookie</strong>
            <button onClick={() => setStato(null)} type="button"
              style={{ background: 'none', border: 'none', color: '#aebfca', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>Cookie tecnici</strong>
                <span style={{ fontSize: 12, background: '#2d6a4f', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>Sempre attivi</span>
              </div>
              <p style={{ fontSize: 13, color: '#aebfca', margin: '6px 0 0', lineHeight: 1.5 }}>
                Necessari per il funzionamento del sito e la gestione della sessione di accesso. Non possono essere disabilitati.
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>Cookie analitici (PostHog)</strong>
                <span style={{ fontSize: 12, color: '#aebfca' }}>Richiedono consenso</span>
              </div>
              <p style={{ fontSize: 13, color: '#aebfca', margin: '6px 0 0', lineHeight: 1.5 }}>
                Ci aiutano a capire come viene usato il sito per migliorare l&apos;esperienza. I dati sono aggregati e non identificano personalmente gli utenti. Server in Europa (EU).
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={rifiuta} type="button" style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #aebfca', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 14 }}>
              Solo tecnici
            </button>
            <button onClick={accetta} type="button" style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#0a7ec2', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
              Accetta tutti
            </button>
          </div>
        </div>
      ) : (
        /* ── Vista compatta ── */
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#d0dde7', flex: 1, minWidth: 260, lineHeight: 1.5 }}>
            🍪 Usiamo cookie tecnici (necessari) e analitici (PostHog, opzionali) per migliorare il sito.{' '}
            <Link href="/cookie-policy" style={{ color: '#7ec8e3', textDecoration: 'underline' }}>Cookie Policy</Link>
            {' · '}
            <Link href="/privacy-policy" style={{ color: '#7ec8e3', textDecoration: 'underline' }}>Privacy Policy</Link>
          </p>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <button onClick={() => setStato('dettagli')} type="button"
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #aebfca', background: 'transparent', color: '#d0dde7', cursor: 'pointer', fontSize: 13 }}>
              Personalizza
            </button>
            <button onClick={rifiuta} type="button"
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #aebfca', background: 'transparent', color: '#d0dde7', cursor: 'pointer', fontSize: 13 }}>
              Rifiuta
            </button>
            <button onClick={accetta} type="button"
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0a7ec2', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              Accetta tutti
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
