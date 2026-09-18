'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

const NUM_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }

export default function AbbonatoClient({ abbonamento, prezzi, ruolo, lifetimeAttivo = true, isStaff = false, attesaAttivazione = false, annullato = false, provaScadenza = null }) {
  const t = useTranslations('abbonatoClient')
  const locale = useLocale()
  const nl = NUM_LOCALE[locale] || 'it-IT'
  const fmt = (importo) => parseFloat(String(importo).replace(',', '.')).toLocaleString(nl, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtData = (d) => d ? new Date(d).toLocaleDateString(nl, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  const nMensile = parseFloat(String(prezzi.mensile).replace(',', '.'))
  const nAnnuale = parseFloat(String(prezzi.annuale).replace(',', '.'))
  const risparmioAnnuo = (nMensile * 12) - nAnnuale
  const percRisparmio = nMensile > 0 ? Math.round((risparmioAnnuo / (nMensile * 12)) * 100) : 0
  const mostraRisparmio = risparmioAnnuo > 0.01
  const features = ruolo === 'portiere' ? (t.raw('featuresPortiere') || []) : (t.raw('featuresCoach') || [])

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

  // Collaboratori/staff: l'accesso dipende dall'abbonamento del titolare.
  if (isStaff) {
    return (
      <div className="scheda">
        <h2 style={{ marginTop: 0 }}>{t('staffTitolo')}</h2>
        <p className="sub-intro" style={{ margin: 0 }}>{t('staffTesto')}</p>
      </div>
    )
  }

  if (abbonamento) {
    const pianoLabel = t('piano_' + abbonamento.piano)
    const disdetto = abbonamento.stato === 'disdetto'
    return (
      <div>
        <div className="scheda abbonamento-attivo">
          <div className="abb-icon">{disdetto ? '⏳' : '✅'}</div>
          <div>
            <h2 style={{ margin: 0 }}>{disdetto ? t('disdettoTitolo') : t('attivoTitolo')}</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--ink-soft)' }}>
              {t('pianoLabel')} <b>{pianoLabel}</b>
              {abbonamento.piano !== 'lifetime'
                ? <> · {disdetto ? t('attivoFino') : t('scadenza')} <b>{fmtData(abbonamento.scadenza)}</b></>
                : <> · <b>{t('nessunaScadenza')}</b></>}
            </p>
          </div>
        </div>
        {abbonamento.piano !== 'lifetime' && !abbonamento.gestibile && (
          <p className="sub-intro" style={{ marginTop: 16 }}>{t('manualeNota')}</p>
        )}
        {abbonamento.piano !== 'lifetime' && abbonamento.gestibile && (
          <div style={{ marginTop: 20 }}>
            <p className="sub-intro">{disdetto ? t('gestisciIntroDisdetto') : t('gestisciIntro')}</p>
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
      {attesaAttivazione && <div className="ok-msg" style={{ marginBottom: 16 }}>{t('attesaAttivazione')}</div>}
      {annullato && !attesaAttivazione && <div className="sub-intro" style={{ marginBottom: 16 }}>{t('annullato')}</div>}
      {provaScadenza && <div className="ok-msg" style={{ marginBottom: 16 }}>{t('provaInCorso', { data: fmtData(provaScadenza) })}</div>}
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
            {p.id === 'annuale' && mostraRisparmio && (
              <div style={{ display: 'inline-block', margin: '2px 0 8px', padding: '3px 10px', borderRadius: 999, background: 'rgba(46,158,91,0.12)', color: 'var(--campo, #2e9e5b)', fontSize: 12.5, fontWeight: 700 }}>
                {t('risparmio', { importo: '€' + fmt(risparmioAnnuo), perc: percRisparmio + '%' })}
              </div>
            )}
            <p className="piano-desc">{p.desc}</p>
            <button className="btn piano-cta" onClick={() => checkout(p.id)} disabled={!!loading} type="button">
              {loading === p.id ? t('caricamento') : t('scegli')}
            </button>
          </div>
        ))}
      </div>
      {features.length > 0 && (
        <div style={{ marginTop: 28, padding: '20px 22px', borderRadius: 12, background: 'var(--card-soft, rgba(10,126,194,0.05))', border: '1px solid rgba(10,126,194,0.15)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>{t('sbloccoTitolo')}</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {features.map((f, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14 }}>
                <span aria-hidden="true" style={{ flexShrink: 0, marginTop: 1, color: 'var(--campo, #2e9e5b)', fontWeight: 800 }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="sub-intro" style={{ marginTop: 20, fontSize: 12 }}>{t('pagamentoSicuro')}</p>
    </div>
  )
}
