'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CollegaSupervisoreBox({ supervisoreAttuale }) {
  const router = useRouter()
  const [codice, setCodice] = useState('')
  const [busy, setBusy] = useState(false)
  const [messaggio, setMessaggio] = useState('')
  const [errore, setErrore] = useState('')

  async function collega() {
    if (!codice.trim()) { setErrore('Inserisci il codice ricevuto.'); return }
    setBusy(true)
    setErrore('')
    setMessaggio('')
    try {
      // Estrai il token dal codice: può essere un link completo o solo il token
      let token = codice.trim()
      if (token.includes('invito=')) {
        token = token.split('invito=')[1].split('&')[0]
      }

      const res = await fetch('/api/consuma-invito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()

      if (!res.ok) {
        setErrore(json.error ?? 'Codice non valido o già utilizzato.')
      } else if (json.tipo !== 'preparatore') {
        setErrore('Questo codice non è un invito di tipo supervisione.')
      } else {
        setMessaggio('✅ Collegamento avvenuto! Ora il tuo responsabile può accedere alla tua area.')
        setCodice('')
        router.refresh()
      }
    } catch (e) {
      setErrore(e.message)
    }
    setBusy(false)
  }

  // Se ha già un supervisore, mostra solo lo stato
  if (supervisoreAttuale) {
    return (
      <div className="scheda" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Supervisore</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🔗</span>
          <div>
            <div style={{ fontWeight: 600 }}>Sei collegato a un responsabile</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
              Il tuo responsabile può visualizzare la tua area in sola lettura.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="scheda" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>Collegati a un responsabile</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
        Se il tuo responsabile ti ha inviato un codice o un link di supervisione, incollalo qui per collegarti al suo account.
      </p>

      {errore && <div className="err" style={{ marginBottom: 10 }}>{errore}</div>}
      {messaggio && (
        <div style={{
          background: 'rgba(46,158,91,0.08)', border: '1px solid var(--verde)',
          borderRadius: 'var(--r-sm)', padding: '10px 14px',
          fontSize: 13, color: 'var(--verde)', marginBottom: 10,
        }}>
          {messaggio}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={codice}
          onChange={(e) => setCodice(e.target.value)}
          placeholder="Incolla il codice o il link ricevuto"
          style={{
            flex: 1, minWidth: 200,
            padding: '10px 14px',
            border: '1px solid var(--linea)',
            borderRadius: 'var(--r-sm)',
            fontSize: 14,
            background: 'var(--carta)',
          }}
          onKeyDown={(e) => e.key === 'Enter' && collega()}
        />
        <button
          className="btn"
          onClick={collega}
          disabled={busy || !codice.trim()}
          type="button"
          style={{ flexShrink: 0 }}
        >
          {busy ? 'Collegamento...' : 'Collegati'}
        </button>
      </div>
    </div>
  )
}
