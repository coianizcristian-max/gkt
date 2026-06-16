'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Suggerimenti({ isStaff, iniziali = [] }) {
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
      .insert({ testo: testo.trim(), utente_id: user?.id ?? null })
    if (error) setError(error.message)
    else { setTesto(''); setDone(true); router.refresh() }
    setBusy(false)
  }

  async function segna(id, stato) {
    const supabase = createClient()
    const { error } = await supabase.from('suggerimenti').update({ stato }).eq('id', id)
    if (error) alert('Errore: ' + error.message)
    router.refresh()
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">Hai un'idea per migliorare GKT o hai trovato un problema? Scrivilo qui: arrivera al supervisore.</p>
      <div className="field">
        <label>Il tuo suggerimento</label>
        <textarea rows="4" value={testo} onChange={(e) => { setTesto(e.target.value); setDone(false) }} />
      </div>
      {error && <div className="err">{error}</div>}
      <div className="form-actions">
        <button className="btn" onClick={invia} disabled={busy} type="button">
          {busy ? 'Invio...' : done ? 'Inviato \u2713' : 'Invia'}
        </button>
      </div>

      {isStaff && (
        <div className="elenco-blocco">
          <h3>Ricevuti</h3>
          {iniziali.length === 0 && <p className="sub-intro">Nessun suggerimento ricevuto.</p>}
          {iniziali.map((s) => (
            <div className={`lista-riga ${s.stato === 'gestito' ? 'assente' : ''}`} key={s.id}>
              <div style={{ flex: 1 }}>
                <div>{s.testo}</div>
                <small>{new Date(s.created_at).toLocaleDateString('it-IT')} &middot; {s.stato}</small>
              </div>
              {s.stato !== 'gestito'
                ? <button className="btn-mini" onClick={() => segna(s.id, 'gestito')} type="button">Segna gestito</button>
                : <button className="btn-mini" onClick={() => segna(s.id, 'nuovo')} type="button">Riapri</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
