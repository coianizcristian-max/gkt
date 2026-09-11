'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

const NUM_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }

export default function AbbonatoClient({ abbonamento, prezzi, ruolo, lifetimeAttivo = true }) {
  const t = useTranslations('abbonatoClient')
  const locale = useLocale()
  const nl = NUM_LOCALE[locale] || 'it-IT'
  const fmt = (importo) => parseFloat(String(importo).replace(',', '.')).toLocaleString(nl, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtData = (d) => d ? new Date(d).toLocaleDateString(nl, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  const PIANI = [
    { id: 'mensile', nome: t('piano_mensile'), prezzo: fmt(prezzi.mensile), periodo: t('periodoMese'), desc: t('descMensile') },
    { id: 'annuale', nome: t('piano_annuale'), prezzo: fmt(prezzi.annuale), periodo: t('periodoAnno'), desc: t('descAnnuale'), highlight: true, badge: t('badgeConveniente') },
    ...(lifetimeAttivo ? [{ id: 'lifetime', nome: t('piano_lifetime'), prezzo: fmt(prezzi.lifetime), periodo: t('periodoUnaTantum'), desc: t('descLifetime') }] : []),
  ]

  async function checkout(pianoId) {
    setLoading(pianoId); setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piano: pianoId, ruolo }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? t('erroreSconosciuto')); setLoading(null); return }
      window.location.href = body.url
    } catch (e) { setError(t('erroreRete')); setLoading(null) }
  }

  async function portalStripe() {
    setLoading('portal'); setError('')
    try {
      const res = await fetch('/api/checkout/portal', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? t('errore')); setLoading(null); return }
      window.location.href = body.url
    } catch (e) { setError(t('erroreReteBreve')); setLoading(null) }
  }

  if (abbonamento) {
    const pianoLabel = t('piano_' + abbonamento.piano)
    return (
      <div>
        <div className="scheda abbonamento-attivo">
          <div className="abb-icon">✅</div>
          <div>
            <h2 style={{ margin: 0 }}>{t('attivoTitolo')}</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--ink-soft)' }}>
              {t('pianoLabel')} <b>{pianoLabel}</b>
              {abbonamento.piano !== 'lifetime'
                ? <> · {t('scadenza')} <b>{fmtData(abbonamento.scadenza)}</b></>
                : <> · <b>{t('nessunaScadenza')}</b></>}
            </p>
          </div>
        </div>
        {abbonamento.piano !== 'lifetime' && (
          <div style={{ marginTop: 20 }}>
            <p className="sub-intro">{t('gestisciIntro')}</p>
            {error && <div className="err">{error}</div>}
            <button className="btn" onClick={portalStripe} disabled={loading === 'portal'} type="button">
              {loading === 'portal' ? t('caricamento') : t('gestisci')}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="sub-intro" style={{ fontSize: 15, marginBottom: 24 }}>
        {ruolo === 'portiere' ? t('introPortiere') : t('introCoach')}
      </p>
      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}
      <div className="piani-grid">
        {PIANI.map((p) => (
          <div key={p.id} className={`piano-card ${p.highlight ? 'highlight' : ''}`}>
            {p.badge && <div className="piano-badge">{p.badge}</div>}
            <div className="piano-nome">{p.nome}</div>
            <div className="piano-prezzo">
              <span className="piano-eur">€</span>
              <span className="piano-num">{p.prezzo}</span>
              <span className="piano-periodo">{p.periodo}</span>
            </div>
            <p className="piano-desc">{p.desc}</p>
            <button className="btn piano-cta" onClick={() => checkout(p.id)} disabled={!!loading} type="button">
              {loading === p.id ? t('caricamento') : t('scegli')}
            </button>
          </div>
        ))}
      </div>
      <p className="sub-intro" style={{ marginTop: 20, fontSize: 12 }}>{t('pagamentoSicuro')}</p>
    </div>
  )
}
