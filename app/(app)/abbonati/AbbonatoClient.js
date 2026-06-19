'use client'

import { useState } from 'react'

function fmt(importo) {
  return parseFloat(String(importo).replace(',', '.')).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AbbonatoClient({ abbonamento, prezzi, ruolo }) {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  const PIANI = [
    {
      id: 'mensile',
      nome: 'Mensile',
      prezzo: fmt(prezzi.mensile),
      periodo: '/ mese',
      desc: 'Accesso completo, rinnovo automatico mensile. Disdici quando vuoi.',
    },
    {
      id: 'annuale',
      nome: 'Annuale',
      prezzo: fmt(prezzi.annuale),
      periodo: '/ anno',
      desc: `Rinnovo automatico annuale. Risparmia rispetto al mensile.`,
      highlight: true,
      badge: 'Più conveniente',
    },
    {
      id: 'lifetime',
      nome: 'A vita',
      prezzo: fmt(prezzi.lifetime),
      periodo: 'una tantum',
      desc: 'Paghi una volta sola e hai accesso per sempre, senza rinnovi.',
    },
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
      if (!res.ok) { setError(body.error ?? 'Errore sconosciuto'); setLoading(null); return }
      window.location.href = body.url
    } catch (e) { setError('Errore di rete. Riprova.'); setLoading(null) }
  }

  async function portalStripe() {
    setLoading('portal'); setError('')
    try {
      const res = await fetch('/api/checkout/portal', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Errore'); setLoading(null); return }
      window.location.href = body.url
    } catch (e) { setError('Errore di rete.'); setLoading(null) }
  }

  if (abbonamento) {
    const pianoLabel = PIANI.find((p) => p.id === abbonamento.piano)?.nome ?? abbonamento.piano
    return (
      <div>
        <div className="scheda abbonamento-attivo">
          <div className="abb-icon">✅</div>
          <div>
            <h2 style={{ margin: 0 }}>Abbonamento attivo</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--ink-soft)' }}>
              Piano: <b>{pianoLabel}</b>
              {abbonamento.piano !== 'lifetime'
                ? <> · Scadenza: <b>{fmtData(abbonamento.scadenza)}</b></>
                : <> · <b>Nessuna scadenza</b></>}
            </p>
          </div>
        </div>
        {abbonamento.piano !== 'lifetime' && (
          <div style={{ marginTop: 20 }}>
            <p className="sub-intro">Gestisci abbonamento, carta o disdetta dal portale Stripe:</p>
            {error && <div className="err">{error}</div>}
            <button className="btn" onClick={portalStripe} disabled={loading === 'portal'} type="button">
              {loading === 'portal' ? 'Caricamento...' : 'Gestisci abbonamento →'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="sub-intro" style={{ fontSize: 15, marginBottom: 24 }}>
        {ruolo === 'portiere'
          ? 'Sblocca le statistiche avanzate e il dettaglio del tuo percorso di crescita.'
          : 'Sblocca tutte le funzionalità avanzate: statistiche, obiettivi, ricorrenze automatiche e molto altro.'}
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
              {loading === p.id ? 'Caricamento...' : 'Scegli questo piano'}
            </button>
          </div>
        ))}
      </div>
      <p className="sub-intro" style={{ marginTop: 20, fontSize: 12 }}>
        Pagamento sicuro via Stripe. Disdici in qualsiasi momento.
      </p>
    </div>
  )
}
