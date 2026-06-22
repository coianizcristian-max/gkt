'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CATEGORIE = ['Bug / Problema', 'Nuova funzionalità', 'Miglioria UX', 'Altro']

const STATI = [
  { v: 'nuovo', label: 'Nuovo', colore: '#4a5b68' },
  { v: 'in_valutazione', label: 'In valutazione', colore: '#e8a72c' },
  { v: 'accettato', label: 'Accettato', colore: '#0a7ec2' },
  { v: 'implementato', label: 'Implementato', colore: '#1f8a4c' },
  { v: 'rifiutato', label: 'Non accolto', colore: '#c0392b' },
]
const statoInfo = (v) => STATI.find((s) => s.v === v) ?? STATI[0]

function Badge({ stato }) {
  const s = statoInfo(stato)
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: s.colore, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

// ── Vista pubblica/portiere: form + proprio storico ──────────────────────────
function VistaUtente({ isLoggedIn, miei }) {
  return (
    <div className="elenco-blocco" style={{ marginTop: 24 }}>
      <h3>I tuoi suggerimenti</h3>
      {!isLoggedIn && <p className="sub-intro">Accedi per vedere lo storico dei tuoi suggerimenti precedenti.</p>}
      {isLoggedIn && miei.length === 0 && <p className="sub-intro">Non hai ancora inviato suggerimenti.</p>}
      {miei.map((s) => (
        <div key={s.id} className="lista-riga" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge stato={s.stato} />
            {s.categoria && <span style={{ fontSize: 11, color: 'var(--ink-soft)', background: 'var(--carta)', padding: '2px 8px', borderRadius: 4 }}>{s.categoria}</span>}
          </div>
          <div>{s.testo}</div>
          <small style={{ color: 'var(--ink-soft)' }}>{new Date(s.created_at).toLocaleDateString('it-IT')}</small>
        </div>
      ))}
    </div>
  )
}

// ── Vista staff: gestione workflow completo ──────────────────────────────────
function VistaStaff({ iniziali, onChanged }) {
  const [filtro, setFiltro] = useState('tutti')
  const lista = filtro === 'tutti' ? iniziali : iniziali.filter((s) => s.stato === filtro)

  async function cambiaStato(id, stato) {
    const supabase = createClient()
    const { error } = await supabase.from('suggerimenti').update({ stato }).eq('id', id)
    if (error) alert('Errore: ' + error.message)
    else onChanged()
  }

  return (
    <div className="elenco-blocco">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>Ricevuti ({iniziali.length})</h3>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ fontSize: 13 }}>
          <option value="tutti">Tutti gli stati</option>
          {STATI.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
      </div>
      {lista.length === 0 && <p className="sub-intro">Nessun suggerimento in questo stato.</p>}
      {lista.map((s) => (
        <div className="lista-riga" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }} key={s.id}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
            <Badge stato={s.stato} />
            {s.categoria && <span style={{ fontSize: 11, color: 'var(--ink-soft)', background: 'var(--carta)', padding: '2px 8px', borderRadius: 4 }}>{s.categoria}</span>}
            <small style={{ color: 'var(--ink-soft)', marginLeft: 'auto' }}>
              {new Date(s.created_at).toLocaleDateString('it-IT')} · {s.mittente ?? s.nome ?? 'anonimo'}
            </small>
          </div>
          <div>{s.testo}</div>
          {(s.email && !s.mittente) && <small style={{ color: 'var(--ink-soft)' }}>{s.email}</small>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATI.map((st) => (
              <button key={st.v} type="button"
                disabled={s.stato === st.v}
                onClick={() => cambiaStato(s.id, st.v)}
                className="btn-mini"
                style={{
                  opacity: s.stato === st.v ? 0.4 : 1,
                  background: s.stato === st.v ? undefined : 'transparent',
                  border: `1px solid ${st.colore}`,
                  color: s.stato === st.v ? undefined : st.colore,
                }}>
                {st.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Suggerimenti({ isStaff, isLoggedIn = true, iniziali = [], miei = [] }) {
  const router = useRouter()
  const [testo, setTesto] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIE[0])
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function invia() {
    if (!testo.trim()) return
    setBusy(true); setError(''); setDone(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      testo: testo.trim(), categoria, stato: 'nuovo',
      utente_id: user?.id ?? null,
    }
    if (!user) {
      payload.nome = nome.trim() || null
      payload.email = email.trim() || null
    }
    const { error } = await supabase.from('suggerimenti').insert(payload)
    if (error) setError(error.message)
    else { setTesto(''); setNome(''); setEmail(''); setDone(true); router.refresh() }
    setBusy(false)
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">Hai un&apos;idea per migliorare GKT o hai trovato un problema? Scrivilo qui — lo leggiamo tutti.</p>

      <div className="field">
        <label>Categoria</label>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {CATEGORIE.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {!isLoggedIn && (
        <div className="form-grid">
          <div className="field"><label>Nome (facoltativo)</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="field"><label>Email (facoltativa)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="per ricontattarti se serve" /></div>
        </div>
      )}

      <div className="field">
        <label>Il tuo suggerimento</label>
        <textarea rows="4" value={testo} onChange={(e) => { setTesto(e.target.value); setDone(false) }} />
      </div>
      {error && <div className="err">{error}</div>}
      <div className="form-actions">
        <button className="btn" onClick={invia} disabled={busy || !testo.trim()} type="button">
          {busy ? 'Invio...' : done ? 'Inviato ✓' : 'Invia'}
        </button>
      </div>

      {!isStaff && <VistaUtente isLoggedIn={isLoggedIn} miei={miei} />}
      {isStaff && <VistaStaff iniziali={iniziali} onChanged={() => router.refresh()} />}
    </div>
  )
}
