'use client'

import { useState } from 'react'

const PIANI = [
  {
    id: 'mensile',
    nome: 'Mensile',
    prezzo: '9,90',
    periodo: '/ mese',
    desc: 'Accesso completo, rinnovo automatico mensile. Disdici quando vuoi.',
    highlight: false,
  },
  {
    id: 'annuale',
    nome: 'Annuale',
    prezzo: '79,00',
    periodo: '/ anno',
    desc: 'Equivale a 6,58 €/mese. Rinnovo automatico annuale. Risparmia il 33%.',
    highlight: true,
    badge: 'Più conveniente',
  },
  {
    id: 'lifetime',
    nome: 'A vita',
    prezzo: '199,00',
    periodo: 'una tantum',
    desc: 'Paghi una volta sola e hai accesso per sempre, senza rinnovi.',
    highlight: false,
  },
]

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AbbonatoClient({ abbonamento, userId }) {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  async function checkout(pianoId) {
    setLoading(pianoId); setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piano: pianoId }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Errore sconosciuto'); setLoading(null); return }
      window.location.href = body.url
    } catch (e) {
      setError('Errore di rete. Riprova.'); setLoading(null)
    }
  }

  async function portalStripe() {
    setLoading('portal'); setError('')
    try {
      const res = await fetch('/api/checkout/portal', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Errore'); setLoading(null); return }
      window.location.href = body.url
    } catch (e) {
      setError('Errore di rete.'); setLoading(null)
    }
  }

  // Se ha già un abbonamento attivo
  if (abbonamento) {
    return (
      <div>
        <div className="scheda abbonamento-attivo">
          <div className="abb-icon">✅</div>
          <div>
            <h2 style={{ margin: 0 }}>Abbonamento attivo</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--ink-soft)' }}>
              Piano: <b>{PIANI.find((p) => p.id === abbonamento.piano)?.nome ?? abbonamento.piano}</b>
              {abbonamento.piano !== 'lifetime' && (
                <> · Scadenza: <b>{fmtData(abbonamento.scadenza)}</b></>
              )}
              {abbonamento.piano === 'lifetime' && <> · <b>Nessuna scadenza</b></>}
            </p>
          </div>
        </div>
        {abbonamento.piano !== 'lifetime' && (
          <div style={{ marginTop: 20 }}>
            <p className="sub-intro">Gestisci il tuo abbonamento, aggiorna il metodo di pagamento o cancella il rinnovo automatico dal portale Stripe:</p>
            {error && <div className="err">{error}</div>}
            <button className="btn" onClick={portalStripe} disabled={loading === 'portal'} type="button">
              {loading === 'portal' ? 'Caricamento...' : 'Gestisci abbonamento →'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // Nessun abbonamento — mostra piani
  return (
    <div>
      <p className="sub-intro" style={{ fontSize: 15, marginBottom: 24 }}>
        Sblocca tutte le funzionalità avanzate di GKT: statistiche dettagliate, obiettivi portieri,
        generazione automatica degli allenamenti, visibilità nella ricerca pubblica e molto altro.
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
            <button
              className="btn piano-cta"
              onClick={() => checkout(p.id)}
              disabled={!!loading}
              type="button"
            >
              {loading === p.id ? 'Caricamento...' : 'Scegli questo piano'}
            </button>
          </div>
        ))}
      </div>
      <p className="sub-intro" style={{ marginTop: 20, fontSize: 12 }}>
        Il pagamento è gestito in modo sicuro da Stripe. Puoi disdire in qualsiasi momento dal portale Stripe
        senza contattarci. La disdetta ha effetto alla fine del periodo pagato.
      </p>
    </div>
  )
}
