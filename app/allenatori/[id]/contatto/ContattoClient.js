'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ContattoClient({ allenatoreId, nomeAllenatore, importoFee, giaUnlocked, contatti }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sblocca() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/checkout-contatto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allenatoreId }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Errore'); setLoading(false); return }
      window.location.href = body.url
    } catch (e) { setError('Errore di rete.'); setLoading(false) }
  }

  if (giaUnlocked && contatti) {
    return (
      <div>
        <Link href={`/allenatori/${allenatoreId}`} className="link-inline" style={{ fontSize: 13 }}>← Torna al profilo</Link>
        <div className="scheda" style={{ marginTop: 24 }}>
          <h2 style={{ margin: '0 0 16px' }}>Contatti di {nomeAllenatore}</h2>
          {contatti.telefono && (
            <div className="lista-riga" style={{ marginBottom: 10 }}>
              <span>📞 Telefono</span>
              <a href={`tel:${contatti.telefono}`} className="link-inline" style={{ fontWeight: 700 }}>{contatti.telefono}</a>
            </div>
          )}
          {contatti.citta && (
            <div className="lista-riga">
              <span>📍 Città</span>
              <b>{contatti.citta}</b>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link href={`/allenatori/${allenatoreId}`} className="link-inline" style={{ fontSize: 13 }}>← Torna al profilo</Link>
      <div className="scheda" style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <h2 style={{ margin: '0 0 8px' }}>Sblocca i contatti</h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
          Per vedere telefono ed email di <b>{nomeAllenatore}</b> è richiesto un contributo una tantum di <b>€ {importoFee}</b>.
          Dopo il pagamento i contatti resteranno visibili per sempre.
        </p>
        {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}
        <button className="btn" onClick={sblocca} disabled={loading} type="button" style={{ minWidth: 200 }}>
          {loading ? 'Caricamento...' : `Paga € ${importoFee} e sblocca`}
        </button>
        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--ink-soft)' }}>Pagamento sicuro via Stripe.</p>
      </div>
    </div>
  )
}
