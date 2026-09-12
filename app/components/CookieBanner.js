'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

const CHIAVE = 'gkt-cookie-consent'
const CHIAVE_ID = 'gkt-cookie-consent-id'
// Aggiorna questa versione se cambi il banner o l'informativa cookie: serve a
// sapere a quale versione l'utente ha prestato il consenso.
const VERSIONE_CONSENSO = '2026-09'

// Id casuale del consenso (non è un dato identificativo di per sé), tenuto anche
// in localStorage per correlare eventuali scelte successive dello stesso browser.
function consentId() {
  try {
    let id = localStorage.getItem(CHIAVE_ID)
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2)
      localStorage.setItem(CHIAVE_ID, id)
    }
    return id
  } catch { return null }
}

// Registra il consenso lato server (accountability, art. 7 GDPR). Best-effort:
// non blocca la UI e non altera il comportamento del banner se fallisce.
function registraConsenso(scelta) {
  try {
    fetch('/api/consenso-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        consent_id: consentId(),
        scelta,
        versione: VERSIONE_CONSENSO,
        categorie: { tecnici: true, analitici: scelta === 'accepted' },
      }),
    }).catch(() => {})
  } catch {}
}

export function useCookieConsent() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CHIAVE)
}

export default function CookieBanner() {
  const t = useTranslations('cookieBanner')
  const [stato, setStato] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const salvato = localStorage.getItem(CHIAVE)
    if (salvato) setStato(salvato)
  }, [])

  function accetta() {
    localStorage.setItem(CHIAVE, 'accepted')
    setStato('accepted')
    registraConsenso('accepted')
    if (typeof window !== 'undefined' && window.__posthogOptOut) window.__posthogOptOut = false
    try { window.dispatchEvent(new Event('gkt-consenso-accettato')) } catch {}
  }
  function rifiuta() {
    localStorage.setItem(CHIAVE, 'rejected')
    setStato('rejected')
    registraConsenso('rejected')
    if (typeof window !== 'undefined') window.__posthogOptOut = true
  }

  if (!mounted || stato === 'accepted' || stato === 'rejected') return null

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, background: '#14202b', color: '#fff', boxShadow: '0 -4px 24px rgba(0,0,0,0.25)' }}>
      {stato === 'dettagli' ? (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: 16 }}>{t('gestisci')}</strong>
            <button onClick={() => setStato(null)} type="button" style={{ background: 'none', border: 'none', color: '#aebfca', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>{t('tecniciTitolo')}</strong>
                <span style={{ fontSize: 12, background: '#2d6a4f', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>{t('sempreAttivi')}</span>
              </div>
              <p style={{ fontSize: 13, color: '#aebfca', margin: '6px 0 0', lineHeight: 1.5 }}>{t('tecniciDesc')}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14 }}>{t('analiticiTitolo')}</strong>
                <span style={{ fontSize: 12, color: '#aebfca' }}>{t('richiedonoConsenso')}</span>
              </div>
              <p style={{ fontSize: 13, color: '#aebfca', margin: '6px 0 0', lineHeight: 1.5 }}>{t('analiticiDesc')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={rifiuta} type="button" style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #aebfca', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 14 }}>{t('soloTecnici')}</button>
            <button onClick={accetta} type="button" style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#0a7ec2', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>{t('accettaTutti')}</button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#d0dde7', flex: 1, minWidth: 260, lineHeight: 1.5 }}>
            {t.rich('intro', {
              cookie: (ch) => <Link href="/cookie-policy" style={{ color: '#7ec8e3', textDecoration: 'underline' }}>{ch}</Link>,
              privacy: (ch) => <Link href="/privacy-policy" style={{ color: '#7ec8e3', textDecoration: 'underline' }}>{ch}</Link>,
            })}
          </p>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <button onClick={() => setStato('dettagli')} type="button" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #aebfca', background: 'transparent', color: '#d0dde7', cursor: 'pointer', fontSize: 13 }}>{t('personalizza')}</button>
            <button onClick={rifiuta} type="button" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #aebfca', background: 'transparent', color: '#d0dde7', cursor: 'pointer', fontSize: 13 }}>{t('rifiuta')}</button>
            <button onClick={accetta} type="button" style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0a7ec2', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{t('accettaTutti')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
