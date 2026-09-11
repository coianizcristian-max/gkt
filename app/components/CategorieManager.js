'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function CategorieManager({ categorie, attive, stagioneId, stagioneNome, ownerId }) {
  const t = useTranslations('categorieManager')
  const c = useTranslations('common')
  const router = useRouter()
  const attiveSet = new Set(attive)
  const [busy, setBusy] = useState(false)
  const [ordineLocale, setOrdineLocale] = useState(categorie)
  const dragIndex = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  if (categorie.length !== ordineLocale.length || categorie.some((cat, i) => cat.id !== ordineLocale[i]?.id)) {
    if (!busy) setOrdineLocale(categorie)
  }

  async function toggleAttiva(squadraId, on) {
    if (!stagioneId) { alert(c('nessunaStagione')); return }
    setBusy(true)
    const supabase = createClient()
    let error
    if (on) {
      ;({ error } = await supabase.from('stagione_categorie')
        .upsert({ stagione_id: stagioneId, squadra_id: squadraId }, { onConflict: 'stagione_id,squadra_id', ignoreDuplicates: true }))
    } else {
      ;({ error } = await supabase.from('stagione_categorie')
        .delete().eq('stagione_id', stagioneId).eq('squadra_id', squadraId))
    }
    if (error) alert(t('errore', { msg: error.message }))
    setBusy(false); router.refresh()
  }

  async function aggiungi() {
    setBusy(true)
    const supabase = createClient()
    const maxOrd = ordineLocale.reduce((m, cat) => Math.max(m, cat.ordine), 0)
    const { error } = await supabase.from('squadre').insert({ nome: t('nuovaCategoria'), ordine: maxOrd + 1, owner_id: ownerId })
    if (error) alert(t('errore', { msg: error.message }))
    setBusy(false); router.refresh()
  }

  async function persistiOrdine(nuovoOrdine) {
    setBusy(true)
    const supabase = createClient()
    const updates = nuovoOrdine.map((cat, i) => ({ id: cat.id, ordine: i + 1 }))
    const errors = []
    for (const u of updates) {
      const { error } = await supabase.from('squadre').update({ ordine: u.ordine }).eq('id', u.id)
      if (error) errors.push(error.message)
    }
    if (errors.length) alert(t('errore', { msg: errors.join(', ') }))
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
        {t.rich('intro', { nome: stagioneNome ?? '—', b: (ch) => <b>{ch}</b>, drag: (ch) => <span style={{ fontWeight: 700 }}>{ch}</span> })}
      </p>
      {ordineLocale.map((cat, i) => (
        <CategoriaRiga key={cat.id} categoria={cat} attiva={attiveSet.has(cat.id)}
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
      <button className="btn-ghost" onClick={aggiungi} disabled={busy} type="button">{t('aggiungi')}</button>
    </div>
  )
}

function CategoriaRiga({ categoria, attiva, onToggle, onChanged, canUp, canDown, onUp, onDown, isDragOver, onDragStart, onDragOver, onDragEnd, onDrop }) {
  const t = useTranslations('categorieManager')
  const [nome, setNome] = useState(categoria.nome)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [toggleBusy, setToggleBusy] = useState(false)

  async function handleToggle(e) {
    setToggleBusy(true)
    await onToggle(categoria.id, e.target.checked)
    setToggleBusy(false)
  }

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('squadre').update({ nome }).eq('id', categoria.id)
    if (error) alert(t('errore', { msg: error.message })); else setDone(true)
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
    if (tot > 0) { alert(t('nonEliminabile', { tot })); return }
    if (!confirm(t('confermaElim', { nome: categoria.nome }))) return
    const { error } = await supabase.from('squadre').delete().eq('id', categoria.id)
    if (error) alert(t('errore', { msg: error.message }))
    onChanged()
  }

  return (
    <div className={`lista-riga cat-riga ${isDragOver ? 'drag-over' : ''}`} draggable
      onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDrop={onDrop}>
      <span className="drag-handle" title={t('trascina')} aria-hidden="true">⠿</span>
      <span className="ord-frecce">
        <button className="btn-frec" onClick={onUp} disabled={!canUp} type="button" aria-label={t('su')}>&uarr;</button>
        <button className="btn-frec" onClick={onDown} disabled={!canDown} type="button" aria-label={t('giu')}>&darr;</button>
      </span>
      <input className="lista-nome" value={nome} onChange={(e) => { setNome(e.target.value); setDone(false) }} />
      <label className="lista-attiva">
        <input type="checkbox" checked={attiva} disabled={toggleBusy} onChange={handleToggle} />
        {t('attivaInStagione')}
      </label>
      <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '✓' : t('salva')}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">{t('elimina')}</button>
    </div>
  )
}
