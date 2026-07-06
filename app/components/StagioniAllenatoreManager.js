'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function fmtData(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function StagioniAllenatoreManager({ stagioni, ownerId }) {
  const router = useRouter()
  const [busy, setBusy] = useState(null) // id della stagione in elaborazione
  const [editId, setEditId] = useState(null) // id della stagione in modifica

  async function rendiAttiva(id) {
    setBusy(id)
    const supabase = createClient()
    const e1 = (await supabase.from('stagioni').update({ attiva: false }).eq('owner_id', ownerId).neq('id', id)).error
    const e2 = (await supabase.from('stagioni').update({ attiva: true }).eq('id', id)).error
    if (e1 || e2) alert('Errore: ' + (e1 || e2).message)
    setBusy(null)
    router.refresh()
  }

  if (stagioni.length === 0) {
    return (
      <div className="empty">
        Nessuna stagione ancora.{' '}
        <Link href="/stagioni/nuova" className="link-inline">Crea la tua prima stagione →</Link>
      </div>
    )
  }

  return (
    <div className="lista-editor">
      {stagioni.map((s) => (
        editId === s.id ? (
          <ModificaStagioneCard
            key={s.id}
            stagione={s}
            onFatto={() => { setEditId(null); router.refresh() }}
            onAnnulla={() => setEditId(null)}
          />
        ) : (
          <div key={s.id} className={`stagione-card ${s.attiva ? 'attiva' : ''}`}>
            <div className="stagione-top">
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{s.nome}</div>
                {s.societa_nome && (
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{s.societa_nome}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {s.attiva
                  ? <span className="badge-attiva">✓ Attiva</span>
                  : (
                    <button
                      className="btn-mini"
                      type="button"
                      disabled={busy === s.id}
                      onClick={() => rendiAttiva(s.id)}
                    >
                      {busy === s.id ? '...' : 'Rendi attiva'}
                    </button>
                  )}
                <button
                  type="button"
                  className="btn-icon-ghost"
                  aria-label="Modifica stagione"
                  title="Modifica stagione"
                  onClick={() => setEditId(s.id)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 20L4.8 16.6L16 5.4C16.5 4.9 17.3 4.9 17.8 5.4L19.6 7.2C20.1 7.7 20.1 8.5 19.6 9L8.4 20.2L4 20Z"
                      stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M14.5 7L18 10.5" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </button>
                <EliminaStagioneButton id={s.id} onFatto={() => router.refresh()} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
              <span>📅 {fmtData(s.data_inizio)} → {fmtData(s.data_fine)}</span>
            </div>
          </div>
        )
      ))}

      <div style={{ marginTop: 8 }}>
        <Link href="/stagioni/nuova" className="btn-ghost">+ Nuova stagione</Link>
      </div>
    </div>
  )
}

function ModificaStagioneCard({ stagione, onFatto, onAnnulla }) {
  const [nome, setNome] = useState(stagione.nome ?? '')
  const [societaNome, setSocietaNome] = useState(stagione.societa_nome ?? '')
  const [dataInizio, setDataInizio] = useState(stagione.data_inizio ?? '')
  const [dataFine, setDataFine] = useState(stagione.data_fine ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function salva() {
    setBusy(true); setErr('')
    try {
      const res = await fetch(`/api/stagioni/${stagione.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, societaNome, dataInizio: dataInizio || null, dataFine: dataFine || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(body.error || 'Errore.'); setBusy(false); return }
      onFatto()
    } catch (e) {
      setErr('Errore di rete.'); setBusy(false)
    }
  }

  return (
    <div className="stagione-card stagione-card-edit">
      {err && <div className="err" style={{ marginBottom: 10 }}>{err}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label className="campo-label">
          Nome stagione
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. 2025-26" />
        </label>
        <label className="campo-label">
          Società
          <input value={societaNome} onChange={(e) => setSocietaNome(e.target.value)} placeholder="es. ASD Azzurra Sandrigo" />
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="campo-label" style={{ flex: 1 }}>
            Data inizio
            <input type="date" value={dataInizio ?? ''} onChange={(e) => setDataInizio(e.target.value)} />
          </label>
          <label className="campo-label" style={{ flex: 1 }}>
            Data fine
            <input type="date" value={dataFine ?? ''} onChange={(e) => setDataFine(e.target.value)} />
          </label>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
        <button className="btn-ghost" type="button" onClick={onAnnulla} disabled={busy}>Annulla</button>
        <button className="btn" type="button" onClick={salva} disabled={busy}>
          {busy ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
      </div>
    </div>
  )
}

function EliminaStagioneButton({ id, onFatto }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function conferma() {
    setDeleting(true); setError('')
    try {
      const res = await fetch(`/api/stagioni/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Errore durante l\'eliminazione.')
      onFatto()
    } catch (err) {
      setError(err.message || 'Errore imprevisto.')
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="elimina-conferma">
        <span className="elimina-conferma-testo">Eliminare la stagione?</span>
        <button type="button" className="btn-danger-solid" onClick={conferma} disabled={deleting}>
          {deleting ? 'Eliminazione…' : 'Sì, elimina'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={deleting}>
          Annulla
        </button>
        {error && <span className="elimina-conferma-errore">{error}</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="btn-icon-danger"
      onClick={() => setConfirming(true)}
      aria-label="Elimina stagione"
      title="Elimina stagione"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 7H20M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7M18 7L17.3 19.1C17.2 20.1 16.4 20.8 15.4 20.8H8.6C7.6 20.8 6.8 20.1 6.7 19.1L6 7"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M10 11V16.5M14 11V16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  )
}
