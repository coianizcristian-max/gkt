'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CouponManager({ coupon, utilizziPerCoupon }) {
  const router = useRouter()
  const [tipo, setTipo] = useState('accesso_gratuito')
  const [codice, setCodice] = useState('')
  const [durata, setDurata] = useState(30)
  const [scadenzaAttivazione, setScadenzaAttivazione] = useState('')
  const [maxUtilizzi, setMaxUtilizzi] = useState('')
  const [scontoPercento, setScontoPercento] = useState(20)
  const [scontoMesi, setScontoMesi] = useState(3)
  const [targetAbbonamento, setTargetAbbonamento] = useState('tutti')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function crea() {
    if (!codice.trim()) { setErr('Inserisci un codice'); return }
    setBusy(true); setErr('')
    const payload = { codice, tipo }
    if (tipo === 'accesso_gratuito') {
      payload.durata_gg = durata
      payload.scadenza_attivazione = scadenzaAttivazione || null
      payload.max_utilizzi = maxUtilizzi ? Number(maxUtilizzi) : null
      payload.target_abbonamento = targetAbbonamento
    } else {
      payload.sconto_percento = Number(scontoPercento)
      payload.sconto_mesi = Number(scontoMesi)
      payload.scadenza_attivazione = scadenzaAttivazione || null
      payload.max_utilizzi = maxUtilizzi ? Number(maxUtilizzi) : null
    }
    const res = await fetch('/api/coupon-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok) setErr(body.error)
    else {
      setCodice(''); setScadenzaAttivazione(''); setMaxUtilizzi('')
      router.refresh()
    }
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
        I coupon <b>ad accesso gratuito</b> sbloccano tutte le funzionalità per un periodo limitato senza pagare
        (ogni utente può usarne uno una sola volta). I coupon <b>sconto</b> si applicano invece direttamente
        nella pagina di pagamento Stripe: l&apos;utente li inserisce lì al momento dell&apos;abbonamento, non in
        questa app.
      </p>

      <div className="scheda" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Crea nuovo coupon</h3>
        {err && <div className="err">{err}</div>}
        <div className="form-grid">
          <div className="field">
            <label>Tipo coupon</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="accesso_gratuito">Accesso gratuito (sblocca tutto per un periodo)</option>
              <option value="sconto_stripe">Sconto % sull&apos;abbonamento</option>
            </select>
          </div>
          <div className="field">
            <label>Codice coupon</label>
            <input value={codice} onChange={(e) => setCodice(e.target.value.toUpperCase())}
              placeholder="es. PROVA30" style={{ fontFamily: 'monospace', letterSpacing: 2 }} />
          </div>

          {tipo === 'accesso_gratuito' && (
            <div className="field">
              <label>Durata accesso (giorni, dalla data di riscatto)</label>
              <input type="number" min="1" max="365" value={durata} onChange={(e) => setDurata(e.target.value)} />
            </div>
          )}

          {tipo === 'accesso_gratuito' && (
            <div className="field">
              <label>Per chi vale</label>
              <select value={targetAbbonamento} onChange={(e) => setTargetAbbonamento(e.target.value)}>
                <option value="tutti">Tutti</option>
                <option value="abbonati">Solo chi ha già un abbonamento attivo</option>
                <option value="non_abbonati">Solo chi non ha ancora un abbonamento</option>
              </select>
            </div>
          )}

          {tipo === 'sconto_stripe' && (
            <>
              <div className="field">
                <label>Sconto (%)</label>
                <input type="number" min="1" max="100" value={scontoPercento} onChange={(e) => setScontoPercento(e.target.value)} />
              </div>
              <div className="field">
                <label>Per i primi N mesi di abbonamento</label>
                <input type="number" min="1" max="36" value={scontoMesi} onChange={(e) => setScontoMesi(e.target.value)} />
              </div>
            </>
          )}

          <div className="field">
            <label>Scadenza per l&apos;attivazione (opzionale)</label>
            <input type="date" value={scadenzaAttivazione} onChange={(e) => setScadenzaAttivazione(e.target.value)} />
            <small style={{ color: 'var(--ink-soft)' }}>Dopo questa data il codice non è più riscattabile, anche se mai usato.</small>
          </div>
          <div className="field">
            <label>Limite utilizzi (opzionale)</label>
            <input type="number" min="1" value={maxUtilizzi} onChange={(e) => setMaxUtilizzi(e.target.value)}
              placeholder="es. 20 = solo i primi 20" />
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
          const scadutaAttivazione = c.scadenza_attivazione && new Date(c.scadenza_attivazione) < new Date()
          return (
            <div key={c.id} className={`lista-riga ${c.attivo ? '' : 'assente'}`}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>
                  {c.codice} {c.tipo === 'sconto_stripe' && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--azzurro)', background: 'rgba(10,126,194,0.1)', padding: '2px 8px', borderRadius: 999, marginLeft: 6 }}>SCONTO</span>}
                </div>
                <small style={{ color: 'var(--ink-soft)' }}>
                  {c.tipo === 'sconto_stripe'
                    ? `${c.sconto_percento}% di sconto per ${c.sconto_mesi} mesi · utilizzi tracciati su Stripe`
                    : `${c.durata_gg} giorni · usato da ${utilizzi.length} utenti (${attivi} ancora attivi)`}
                  {c.max_utilizzi ? ` · limite ${c.max_utilizzi} utilizzi` : ''}
                  {c.scadenza_attivazione ? ` · attivabile fino al ${new Date(c.scadenza_attivazione).toLocaleDateString('it-IT')}${scadutaAttivazione ? ' (scaduto)' : ''}` : ''}
                  {c.tipo === 'accesso_gratuito' && c.target_abbonamento && c.target_abbonamento !== 'tutti'
                    ? ` · solo per ${c.target_abbonamento === 'abbonati' ? 'chi è già abbonato' : 'chi non è ancora abbonato'}`
                    : ''}
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
