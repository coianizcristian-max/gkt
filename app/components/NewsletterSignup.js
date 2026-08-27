'use client'

import { useState } from 'react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [stato, setStato] = useState('idle') // idle | invio | ok | gia | errore
  const [msg, setMsg] = useState('')

  async function invia(e) {
    e?.preventDefault?.()
    const em = email.trim()
    if (!EMAIL_RE.test(em)) { setStato('errore'); setMsg('Inserisci un indirizzo email valido.'); return }
    setStato('invio'); setMsg('')
    try {
      const res = await fetch('/api/newsletter/iscrivi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em }),
      })
      const data = await res.json()
      if (!res.ok) { setStato('errore'); setMsg(data.error || 'Qualcosa è andato storto. Riprova.'); return }
      if (data.stato === 'gia_iscritto') { setStato('gia'); setMsg('Sei già iscritto alla newsletter.') }
      else { setStato('ok'); setMsg("Ti abbiamo inviato una email: clicca il link per confermare l'iscrizione.") }
    } catch { setStato('errore'); setMsg('Errore di rete. Riprova.') }
  }

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>📬 Iscriviti alla newsletter GKSeason</div>
      <p style={{ fontSize: 13, color: 'var(--ink-soft, #6b7e8e)', margin: '0 0 12px' }}>
        Aggiornamenti e novità sul gestionale. Puoi disiscriverti quando vuoi.
      </p>
      {stato === 'ok' || stato === 'gia' ? (
        <div style={{ fontSize: 14, color: 'var(--campo, #1f8a4c)', fontWeight: 600 }}>{msg}</div>
      ) : (
        <form onSubmit={invia} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="La tua email"
            style={{ flex: '1 1 220px', minWidth: 0, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--linea, #d8dee4)', fontSize: 15 }}
          />
          <button type="submit" disabled={stato === 'invio'} className="btn" style={{ padding: '10px 18px', borderRadius: 8 }}>
            {stato === 'invio' ? '…' : 'Iscrivimi'}
          </button>
        </form>
      )}
      {stato === 'errore' && <div style={{ fontSize: 13, color: 'var(--rosso, #d6493b)', marginTop: 8 }}>{msg}</div>}
    </div>
  )
}
