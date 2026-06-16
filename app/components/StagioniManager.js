'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StagioniManager({ stagioni }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function rendiAttiva(id) {
    const supabase = createClient()
    const e1 = (await supabase.from('stagioni').update({ attiva: false }).neq('id', id)).error
    const e2 = (await supabase.from('stagioni').update({ attiva: true }).eq('id', id)).error
    if (e1 || e2) alert('Errore: ' + (e1 || e2).message)
    router.refresh()
  }

  async function creaStagione() {
    const nome = prompt('Nome della nuova stagione (es. 2026-27):')
    if (!nome) return
    setCreating(true)
    const supabase = createClient()
    const { error } = await supabase.from('stagioni').insert({ nome: nome.trim(), attiva: false })
    if (error) alert('Errore: ' + error.message)
    setCreating(false); router.refresh()
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">La stagione <b>attiva</b> e quella usata da calendario, partite, statistiche e portieri. Puo essere attiva una sola stagione alla volta.</p>
      {stagioni.map((s) => (
        <StagioneRiga key={s.id} stagione={s} onAttiva={() => rendiAttiva(s.id)} onChanged={() => router.refresh()} />
      ))}
      <button className="btn-ghost" onClick={creaStagione} disabled={creating} type="button">+ Nuova stagione</button>
    </div>
  )
}

function StagioneRiga({ stagione, onAttiva, onChanged }) {
  const [f, setF] = useState({
    nome: stagione.nome ?? '',
    societa_nome: stagione.societa_nome ?? '',
    data_inizio: stagione.data_inizio ?? '',
    data_fine: stagione.data_fine ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('stagioni').update({
      nome: f.nome, societa_nome: f.societa_nome || null,
      data_inizio: f.data_inizio || null, data_fine: f.data_fine || null,
    }).eq('id', stagione.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    setBusy(false); onChanged()
  }

  return (
    <div className={`stagione-card ${stagione.attiva ? 'attiva' : ''}`}>
      <div className="stagione-top">
        <input className="lista-nome" value={f.nome} onChange={upd('nome')} placeholder="Nome stagione" />
        {stagione.attiva
          ? <span className="badge-attiva">Attiva</span>
          : <button className="btn-mini" onClick={onAttiva} type="button">Rendi attiva</button>}
      </div>
      <div className="form-grid">
        <div className="field"><label>Societa</label><input value={f.societa_nome} onChange={upd('societa_nome')} /></div>
        <div className="field"><label>Inizio</label><input type="date" value={f.data_inizio} onChange={upd('data_inizio')} /></div>
        <div className="field"><label>Fine</label><input type="date" value={f.data_fine} onChange={upd('data_fine')} /></div>
      </div>
      <div className="form-actions">
        <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '\u2713 Salvato' : 'Salva'}</button>
      </div>
    </div>
  )
}
