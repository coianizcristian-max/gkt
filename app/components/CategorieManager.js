'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CategorieManager({ categorie, attive, stagioneId, stagioneNome }) {
  const router = useRouter()
  const attiveSet = new Set(attive)
  const [busy, setBusy] = useState(false)

  async function toggleAttiva(squadraId, on) {
    if (!stagioneId) { alert('Nessuna stagione attiva.'); return }
    setBusy(true)
    const supabase = createClient()
    let error
    if (on) {
      ;({ error } = await supabase.from('stagione_categorie')
        .insert({ stagione_id: stagioneId, squadra_id: squadraId }))
    } else {
      ;({ error } = await supabase.from('stagione_categorie')
        .delete().eq('stagione_id', stagioneId).eq('squadra_id', squadraId))
    }
    if (error) alert('Errore: ' + error.message)
    setBusy(false); router.refresh()
  }

  async function aggiungi() {
    setBusy(true)
    const supabase = createClient()
    const maxOrd = categorie.reduce((m, c) => Math.max(m, c.ordine), 0)
    const { error } = await supabase.from('squadre').insert({ nome: 'Nuova categoria', ordine: maxOrd + 1 })
    if (error) alert('Errore: ' + error.message)
    setBusy(false); router.refresh()
  }

  async function muovi(index, dir) {
    const a = categorie[index]
    const b = categorie[index + dir]
    if (!a || !b) return
    setBusy(true)
    const supabase = createClient()
    const e1 = (await supabase.from('squadre').update({ ordine: b.ordine }).eq('id', a.id)).error
    const e2 = (await supabase.from('squadre').update({ ordine: a.ordine }).eq('id', b.id)).error
    if (e1 || e2) alert('Errore: ' + (e1 || e2).message)
    setBusy(false); router.refresh()
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">
        Crea e ordina le categorie, e scegli quali sono attive nella stagione <b>{stagioneNome ?? '—'}</b>.
        Solo le categorie attive compaiono nei menù a tendina (scheda portiere, allenamenti…).
      </p>
      {categorie.map((c, i) => (
        <CategoriaRiga key={c.id} categoria={c} attiva={attiveSet.has(c.id)}
          onToggle={toggleAttiva} onChanged={() => router.refresh()}
          canUp={i > 0} canDown={i < categorie.length - 1}
          onUp={() => muovi(i, -1)} onDown={() => muovi(i, 1)} />
      ))}
      <button className="btn-ghost" onClick={aggiungi} disabled={busy} type="button">+ Aggiungi categoria</button>
    </div>
  )
}

function CategoriaRiga({ categoria, attiva, onToggle, onChanged, canUp, canDown, onUp, onDown }) {
  const [nome, setNome] = useState(categoria.nome)
  const [ordine, setOrdine] = useState(categoria.ordine)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('squadre')
      .update({ nome, ordine: Number(ordine) || 0 }).eq('id', categoria.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    setBusy(false); onChanged()
  }

  async function elimina() {
    const supabase = createClient()
    const [i, a, p] = await Promise.all([
      supabase.from('iscrizioni').select('id', { count: 'exact', head: true }).eq('squadra_id', categoria.id),
      supabase.from('allenamenti').select('id', { count: 'exact', head: true }).eq('squadra_id', categoria.id),
      supabase.from('partite').select('id', { count: 'exact', head: true }).eq('squadra_id', categoria.id),
    ])
    const tot = (i.count || 0) + (a.count || 0) + (p.count || 0)
    if (tot > 0) {
      alert(`Non eliminabile: ci sono ${tot} elementi collegati (portieri, allenamenti o partite). Spostali o eliminali prima.`)
      return
    }
    if (!confirm(`Eliminare la categoria "${categoria.nome}"?`)) return
    const { error } = await supabase.from('squadre').delete().eq('id', categoria.id)
    if (error) alert('Errore: ' + error.message)
    onChanged()
  }

  return (
    <div className="lista-riga">
      <span className="ord-frecce">
        <button className="btn-frec" onClick={onUp} disabled={!canUp} type="button" aria-label="Su">&uarr;</button>
        <button className="btn-frec" onClick={onDown} disabled={!canDown} type="button" aria-label="Giu">&darr;</button>
      </span>
      <input className="lista-nome" value={nome} onChange={(e) => { setNome(e.target.value); setDone(false) }} />
      <label className="lista-ord">Ordine
        <input type="number" value={ordine} onChange={(e) => { setOrdine(e.target.value); setDone(false) }} />
      </label>
      <label className="lista-attiva">
        <input type="checkbox" checked={attiva} onChange={(e) => onToggle(categoria.id, e.target.checked)} />
        Attiva in stagione
      </label>
      <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '✓' : 'Salva'}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>
    </div>
  )
}
