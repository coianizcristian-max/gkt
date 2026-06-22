'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CategorieManager({ categorie, attive, stagioneId, stagioneNome, ownerId }) {
  const router = useRouter()
  const attiveSet = new Set(attive)
  const [busy, setBusy] = useState(false)
  const [ordineLocale, setOrdineLocale] = useState(categorie)
  const dragIndex = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  // Tieni sincronizzato lo stato locale quando arrivano nuovi dati dal server
  if (categorie.length !== ordineLocale.length || categorie.some((c, i) => c.id !== ordineLocale[i]?.id)) {
    if (!busy) setOrdineLocale(categorie)
  }

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
    const maxOrd = ordineLocale.reduce((m, c) => Math.max(m, c.ordine), 0)
    const { error } = await supabase.from('squadre').insert({ nome: 'Nuova categoria', ordine: maxOrd + 1, owner_id: ownerId })
    if (error) alert('Errore: ' + error.message)
    setBusy(false); router.refresh()
  }

  // Salva il nuovo ordine sul DB dopo un riordino (sia da frecce che da drag)
  async function persistiOrdine(nuovoOrdine) {
    setBusy(true)
    const supabase = createClient()
    const updates = nuovoOrdine.map((c, i) => ({ id: c.id, ordine: i + 1 }))
    const errors = []
    for (const u of updates) {
      const { error } = await supabase.from('squadre').update({ ordine: u.ordine }).eq('id', u.id)
      if (error) errors.push(error.message)
    }
    if (errors.length) alert('Errore: ' + errors.join(', '))
    setBusy(false); router.refresh()
  }

  async function muovi(index, dir) {
    const nuovo = [...ordineLocale]
    const tmp = nuovo[index]
    nuovo[index] = nuovo[index + dir]
    nuovo[index + dir] = tmp
    setOrdineLocale(nuovo)
    await persistiOrdine(nuovo)
  }

  // ── Drag and drop (desktop) ──────────────────────────────────────────────
  function onDragStart(i) { dragIndex.current = i }
  function onDragOver(e, i) { e.preventDefault(); setDragOver(i) }
  function onDragEnd() { setDragOver(null); dragIndex.current = null }
  async function onDrop(e, i) {
    e.preventDefault()
    const from = dragIndex.current
    setDragOver(null)
    if (from == null || from === i) return
    const nuovo = [...ordineLocale]
    const [moved] = nuovo.splice(from, 1)
    nuovo.splice(i, 0, moved)
    setOrdineLocale(nuovo)
    dragIndex.current = null
    await persistiOrdine(nuovo)
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">
        Crea e ordina le categorie, e scegli quali sono attive nella stagione <b>{stagioneNome ?? '—'}</b>.
        Solo le categorie attive compaiono nei menù a tendina (scheda portiere, allenamenti…).
        Su desktop trascina <span style={{ fontWeight: 700 }}>⠿</span> per riordinare, su mobile usa le frecce.
      </p>
      {ordineLocale.map((c, i) => (
        <CategoriaRiga key={c.id} categoria={c} attiva={attiveSet.has(c.id)}
          onToggle={toggleAttiva} onChanged={() => router.refresh()}
          canUp={i > 0} canDown={i < ordineLocale.length - 1}
          onUp={() => muovi(i, -1)} onDown={() => muovi(i, 1)}
          index={i}
          isDragOver={dragOver === i}
          onDragStart={() => onDragStart(i)}
          onDragOver={(e) => onDragOver(e, i)}
          onDragEnd={onDragEnd}
          onDrop={(e) => onDrop(e, i)}
        />
      ))}
      <button className="btn-ghost" onClick={aggiungi} disabled={busy} type="button">+ Aggiungi categoria</button>
    </div>
  )
}

function CategoriaRiga({ categoria, attiva, onToggle, onChanged, canUp, canDown, onUp, onDown, isDragOver, onDragStart, onDragOver, onDragEnd, onDrop }) {
  const [nome, setNome] = useState(categoria.nome)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('squadre')
      .update({ nome }).eq('id', categoria.id)
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
    <div
      className={`lista-riga cat-riga ${isDragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
    >
      <span className="drag-handle" title="Trascina per riordinare" aria-hidden="true">⠿</span>
      <span className="ord-frecce">
        <button className="btn-frec" onClick={onUp} disabled={!canUp} type="button" aria-label="Su">&uarr;</button>
        <button className="btn-frec" onClick={onDown} disabled={!canDown} type="button" aria-label="Giu">&darr;</button>
      </span>
      <input className="lista-nome" value={nome} onChange={(e) => { setNome(e.target.value); setDone(false) }} />
      <label className="lista-attiva">
        <input type="checkbox" checked={attiva} onChange={(e) => onToggle(categoria.id, e.target.checked)} />
        Attiva in stagione
      </label>
      <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '✓' : 'Salva'}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>
    </div>
  )
}
