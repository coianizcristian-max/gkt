'use client'

import { useState } from 'react'

export default function DisdiciButton({ scadenza }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const scadenzaLabel = scadenza
    ? new Date(scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  async function disdici() {
    const confermato = window.confirm(
      `⚠️ Sei sicuro di voler disdire l'abbonamento?\n\n` +
      (scadenzaLabel
        ? `L'abbonamento resterà attivo fino al ${scadenzaLabel}, poi tornerai al piano gratuito.`
        : `Dopo la disdetta tornerai al piano gratuito.`) +
      `\n\nQuesta azione non può essere annullata.`
    )
    if (!confermato) return

    setBusy(true)
    setErr('')
    try {
      const res = await fetch('/api/disdici-abbonamento', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) { setErr(body.error ?? 'Errore.'); setBusy(false); return }
      setDone(true)
    } catch { setErr('Errore di rete.') }
    setBusy(false)
  }

  if (done) {
    return (
      <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(192,57,43,0.07)', borderRadius: 8, border: '1px solid rgba(192,57,43,0.3)', fontSize: 13 }}>
        ✓ Abbonamento disdetto.{scadenzaLabel ? ` Resterà attivo fino al ${scadenzaLabel}.` : ''} Ricarica la pagina per vedere lo stato aggiornato.
      </div>
    )
  }

  return (
    <div style={{ marginTop: 16 }}>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <button
        type="button"
        className="btn-ghost btn-del"
        style={{ fontSize: 13 }}
        onClick={disdici}
        disabled={busy}
      >
        {busy ? 'Elaborazione...' : '🚫 Disdici abbonamento'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
        {scadenzaLabel
          ? `L'abbonamento resterà attivo fino al ${scadenzaLabel}.`
          : 'L\'abbonamento verrà disattivato alla scadenza.'}
        {' '}Potrai riabbonarti in qualsiasi momento.
      </p>
    </div>
  )
}
