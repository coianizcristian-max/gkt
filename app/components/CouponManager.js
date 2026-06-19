'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CouponManager({ coupon, utilizziPerCoupon }) {
  const router = useRouter()
  const [codice, setCodice] = useState('')
  const [durata, setDurata] = useState(30)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function crea() {
    if (!codice.trim()) { setErr('Inserisci un codice'); return }
    setBusy(true); setErr('')
    const res = await fetch('/api/coupon-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codice, durata_gg: durata }),
    })
    const body = await res.json()
    if (!res.ok) setErr(body.error)
    else { setCodice(''); router.refresh() }
    setBusy(false)
  }

  async function toggle(id, attivo) {
    await fetch('/api/coupon-admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, attivo: !attivo }),
    })
    router.refresh()
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">
        I coupon permettono agli utenti di accedere a tutte le funzionalità per un periodo limitato senza pagare.
        Ogni utente può usare lo stesso coupon <b>una sola volta</b>.
      </p>

      <div className="scheda" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Crea nuovo coupon</h3>
        {err && <div className="err">{err}</div>}
        <div className="form-grid">
          <div className="field">
            <label>Codice coupon</label>
            <input value={codice} onChange={(e) => setCodice(e.target.value.toUpperCase())}
              placeholder="es. PROVA30" style={{ fontFamily: 'monospace', letterSpacing: 2 }} />
          </div>
          <div className="field">
            <label>Durata (giorni)</label>
            <input type="number" min="1" max="365" value={durata} onChange={(e) => setDurata(e.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={crea} disabled={busy} type="button">
            {busy ? 'Creazione...' : 'Crea coupon'}
          </button>
        </div>
      </div>

      <div className="elenco-blocco">
        <h3>Coupon attivi</h3>
        {coupon.length === 0 && <p className="sub-intro">Nessun coupon creato.</p>}
        {coupon.map((c) => {
          const utilizzi = utilizziPerCoupon[c.id] ?? []
          const attivi = utilizzi.filter((u) => new Date(u.scade_il) > new Date()).length
          return (
            <div key={c.id} className={`lista-riga ${c.attivo ? '' : 'assente'}`}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>{c.codice}</div>
                <small style={{ color: 'var(--ink-soft)' }}>
                  {c.durata_gg} giorni · usato da {utilizzi.length} utenti ({attivi} ancora attivi)
                </small>
              </div>
              <button className={`toggle-switch sm ${c.attivo ? 'on' : ''}`} type="button"
                onClick={() => toggle(c.id, c.attivo)} role="switch" aria-checked={c.attivo}>
                <span className="toggle-thumb" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
