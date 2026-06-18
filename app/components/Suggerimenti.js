'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Per il portiere: mostra il proprio storico con esito visibile
function SuggerimentiPortiere({ miei }) {
  return (
    <div className="elenco-blocco" style={{ marginTop: 24 }}>
      <h3>I tuoi suggerimenti</h3>
      {miei.length === 0 && <p className="sub-intro">Non hai ancora inviato suggerimenti.</p>}
      {miei.map((s) => (
        <div key={s.id} className="lista-riga" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <div>{s.testo}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <small style={{ color: 'var(--ink-soft)' }}>{new Date(s.created_at).toLocaleDateString('it-IT')}</small>
            {s.esito === 'accettata' && (
              <span style={{ fontSize: 13, color: 'var(--campo)', fontWeight: 600 }}>✓ Accettata</span>
            )}
            {s.esito === 'rifiutata' && (
              <span style={{ fontSize: 13, color: 'var(--rosso)', fontWeight: 600 }}>✗ Non accettata</span>
            )}
            {(!s.esito || s.esito === 'nuovo') && (
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>In attesa di risposta</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Suggerimenti({ isStaff, iniziali = [], miei = [] }) {
  const router = useRouter()
  const [testo, setTesto] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function invia() {
    if (!testo.trim()) return
    setBusy(true); setError(''); setDone(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('suggerimenti')
      .insert({ testo: testo.trim(), utente_id: user?.id ?? null, stato: 'nuovo', esito: null })
    if (error) setError(error.message)
    else { setTesto(''); setDone(true); router.refresh() }
    setBusy(false)
  }

  async function segna(id, esito) {
    const supabase = createClient()
    const { error } = await supabase.from('suggerimenti')
      .update({ stato: 'gestito', esito }).eq('id', id)
    if (error) alert('Errore: ' + error.message)
    else router.refresh()
  }

  async function riapri(id) {
    const supabase = createClient()
    await supabase.from('suggerimenti').update({ stato: 'nuovo', esito: null }).eq('id', id)
    router.refresh()
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">Hai un&apos;idea per migliorare GKT o hai trovato un problema? Scrivilo qui.</p>
      <div className="field">
        <label>Il tuo suggerimento</label>
        <textarea rows="4" value={testo} onChange={(e) => { setTesto(e.target.value); setDone(false) }} />
      </div>
      {error && <div className="err">{error}</div>}
      <div className="form-actions">
        <button className="btn" onClick={invia} disabled={busy} type="button">
          {busy ? 'Invio...' : done ? 'Inviato ✓' : 'Invia'}
        </button>
      </div>

      {/* Portiere: vede il proprio storico con esito */}
      {!isStaff && <SuggerimentiPortiere miei={miei} />}

      {/* Staff: gestisce tutti i suggerimenti con accetta/rifiuta */}
      {isStaff && (
        <div className="elenco-blocco">
          <h3>Ricevuti</h3>
          {iniziali.length === 0 && <p className="sub-intro">Nessun suggerimento ricevuto.</p>}
          {iniziali.map((s) => (
            <div className={`lista-riga ${s.stato === 'gestito' ? 'assente' : ''}`} key={s.id}>
              <div style={{ flex: 1 }}>
                <div>{s.testo}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                  <small style={{ color: 'var(--ink-soft)' }}>
                    {new Date(s.created_at).toLocaleDateString('it-IT')} · {s.mittente ?? 'anonimo'}
                  </small>
                  {s.esito === 'accettata' && <span style={{ fontSize: 12, color: 'var(--campo)', fontWeight: 600 }}>✓ Accettata</span>}
                  {s.esito === 'rifiutata' && <span style={{ fontSize: 12, color: 'var(--rosso)', fontWeight: 600 }}>✗ Rifiutata</span>}
                </div>
              </div>
              {s.stato !== 'gestito' ? (
                <>
                  <button className="btn-mini" style={{ background: 'var(--campo)', color: '#fff' }} onClick={() => segna(s.id, 'accettata')} type="button">✓ Accetta</button>
                  <button className="btn-mini btn-del" onClick={() => segna(s.id, 'rifiutata')} type="button">✗ Rifiuta</button>
                </>
              ) : (
                <button className="btn-mini" onClick={() => riapri(s.id)} type="button">Riapri</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
