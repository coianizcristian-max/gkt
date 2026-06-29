'use client'

import { useState, useEffect } from 'react'

export default function PannelloCommenti({ preparatoreId, contesto }) {
  const [commenti, setCommenti] = useState([])
  const [testo, setTesto] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [aperto, setAperto] = useState(false)

  useEffect(() => {
    if (!aperto) return
    caricaCommenti()
  }, [aperto, contesto])

  async function caricaCommenti() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ preparatore_id: preparatoreId })
      if (contesto) params.append('contesto', contesto)
      const res = await fetch(`/api/commenti-supervisione?${params}`)
      if (res.ok) {
        const json = await res.json()
        setCommenti(json.commenti ?? [])
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function invia() {
    if (!testo.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/commenti-supervisione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preparatore_id: preparatoreId, testo, contesto }),
      })
      if (res.ok) {
        setTesto('')
        await caricaCommenti()
      }
    } catch (e) { console.error(e) }
    setBusy(false)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 1000,
      fontFamily: 'inherit',
    }}>
      {/* Pannello aperto */}
      {aperto && (
        <div style={{
          width: 320,
          maxHeight: 420,
          background: 'var(--carta)',
          border: '1px solid var(--linea)',
          borderRadius: 'var(--r)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: 8,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--linea)',
            fontWeight: 700,
            fontSize: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--azzurro)',
            color: '#fff',
          }}>
            <span>💬 Note per il preparatore {contesto ? `· ${contesto}` : ''}</span>
            <button onClick={() => setAperto(false)} type="button"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, padding: 0 }}>
              ×
            </button>
          </div>

          {/* Lista commenti */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading
              ? <div style={{ fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center', padding: 16 }}>Caricamento...</div>
              : commenti.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center', padding: 16 }}>Nessuna nota ancora.</div>
                : commenti.map(c => (
                    <div key={c.id} style={{
                      background: c.sono_io ? 'rgba(10,126,194,0.08)' : 'var(--sfondo)',
                      borderRadius: 'var(--r-sm)',
                      padding: '8px 10px',
                      alignSelf: c.sono_io ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}>
                      <div style={{ fontSize: 13 }}>{c.testo}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 3 }}>
                        {c.sono_io ? 'Tu' : c.mittente} · {new Date(c.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
            }
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--linea)',
            display: 'flex',
            gap: 8,
          }}>
            <textarea
              value={testo}
              onChange={e => setTesto(e.target.value)}
              placeholder="Scrivi una nota..."
              rows={2}
              style={{
                flex: 1,
                padding: '6px 10px',
                border: '1px solid var(--linea)',
                borderRadius: 'var(--r-sm)',
                fontSize: 13,
                resize: 'none',
                fontFamily: 'inherit',
                background: 'var(--carta)',
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia() } }}
            />
            <button
              onClick={invia}
              disabled={busy || !testo.trim()}
              type="button"
              className="btn"
              style={{ alignSelf: 'flex-end', padding: '6px 12px', fontSize: 13 }}
            >
              {busy ? '...' : '→'}
            </button>
          </div>
        </div>
      )}

      {/* Bottone toggle */}
      <button
        onClick={() => setAperto(v => !v)}
        type="button"
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--azzurro)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: 22,
          boxShadow: '0 4px 16px rgba(10,126,194,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 'auto',
        }}
      >
        {aperto ? '×' : '💬'}
      </button>
    </div>
  )
}
