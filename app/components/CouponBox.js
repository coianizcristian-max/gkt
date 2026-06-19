'use client'

import { useState } from 'react'

export default function CouponBox({ onAttivato }) {
  const [codice, setCodice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(null)

  async function attiva() {
    if (!codice.trim()) return
    setLoading(true); setError(''); setOk(null)
    try {
      const res = await fetch('/api/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codice }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error); setLoading(false); return }
      setOk(body)
      if (onAttivato) onAttivato()
      else setTimeout(() => window.location.reload(), 1500)
    } catch (e) { setError('Errore di rete.') }
    setLoading(false)
  }

  if (ok) return (
    <div className="ok-msg" style={{ textAlign: 'center', padding: 16 }}>
      ✅ Codice attivato! Hai accesso completo per <b>{ok.durata_gg} giorni</b>. La pagina si aggiornerà tra un secondo.
    </div>
  )

  return (
    <div className="scheda" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>🎟 Hai un codice promozionale?</h3>
      <p className="sub-intro" style={{ marginBottom: 12 }}>
        Inserisci il codice per attivare un periodo di accesso gratuito.
      </p>
      {error && <div className="err" style={{ marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={codice}
          onChange={(e) => setCodice(e.target.value.toUpperCase())}
          placeholder="es. PROVA30"
          style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', fontFamily: 'monospace', fontSize: 15, letterSpacing: 2 }}
          onKeyDown={(e) => e.key === 'Enter' && attiva()}
        />
        <button className="btn" onClick={attiva} disabled={loading || !codice.trim()} type="button"
          style={{ width: 'auto', padding: '10px 18px' }}>
          {loading ? '...' : 'Attiva'}
        </button>
      </div>
    </div>
  )
}
