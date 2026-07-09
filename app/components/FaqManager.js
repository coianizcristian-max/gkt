'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function FaqManager({ faq }) {
  const router = useRouter()
  const [target, setTarget] = useState('allenatore')
  const [categoriaAttiva, setCategoriaAttiva] = useState(null)
  const [nuovaCategoria, setNuovaCategoria] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [busy, setBusy] = useState(false)

  const perTarget = useMemo(() => faq.filter((f) => f.target === target), [faq, target])

  // Categorie nell'ordine in cui compaiono (già ordinate per categoria/ordine dalla query)
  const categorie = useMemo(() => {
    const viste = []
    for (const f of perTarget) if (!viste.includes(f.categoria)) viste.push(f.categoria)
    return viste
  }, [perTarget])

  // Se la categoria selezionata non esiste più (o cambio target), riparti dalla prima disponibile
  useEffect(() => {
    if (!categorie.includes(categoriaAttiva)) setCategoriaAttiva(categorie[0] ?? null)
  }, [target, categorie, categoriaAttiva])

  const domandeCategoria = perTarget.filter((f) => f.categoria === categoriaAttiva)

  async function creaCategoria() {
    const nome = nuovaCategoria.trim()
    if (!nome) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('faq_interne').insert({
      categoria: nome, domanda: 'Nuova domanda', risposta: '', target, ordine: 1,
    })
    if (error) { alert('Errore: ' + error.message); setBusy(false); return }
    setNuovaCategoria(''); setCreandoCategoria(false); setBusy(false)
    setCategoriaAttiva(nome)
    router.refresh()
  }

  async function aggiungiDomanda() {
    setBusy(true)
    const supabase = createClient()
    const maxOrd = domandeCategoria.reduce((m, f) => Math.max(m, f.ordine), 0)
    const { error } = await supabase.from('faq_interne').insert({
      categoria: categoriaAttiva, domanda: 'Nuova domanda', risposta: '', target, ordine: maxOrd + 1,
    })
    if (error) alert('Errore: ' + error.message)
    setBusy(false)
    router.refresh()
  }

  async function eliminaCategoria() {
    if (!confirm(`Eliminare tutta la categoria "${categoriaAttiva}" e tutte le sue domande (${domandeCategoria.length})? Non si può annullare.`)) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('faq_interne').delete().eq('target', target).eq('categoria', categoriaAttiva)
    if (error) alert('Errore: ' + error.message)
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="lista-editor">
      {/* Tab di primo livello: a chi si rivolgono */}
      <div className="sub-nav" style={{ marginBottom: 16 }}>
        <button type="button" className={`sub-nav-link ${target === 'allenatore' ? 'active' : ''}`} onClick={() => setTarget('allenatore')}>
          Allenatori e staff
        </button>
        <button type="button" className={`sub-nav-link ${target === 'portiere' ? 'active' : ''}`} onClick={() => setTarget('portiere')}>
          Portieri
        </button>
      </div>

      {/* Tab di secondo livello: categorie dentro il target scelto */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 16 }}>
        {categorie.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoriaAttiva(c)}
            className={c === categoriaAttiva ? 'btn-mini' : 'btn-mini btn-ghost'}
          >
            {c} ({perTarget.filter((f) => f.categoria === c).length})
          </button>
        ))}

        {!creandoCategoria && (
          <button type="button" className="btn-mini btn-ghost" onClick={() => setCreandoCategoria(true)}>+ Nuova categoria</button>
        )}
        {creandoCategoria && (
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <input
              autoFocus
              value={nuovaCategoria}
              onChange={(e) => setNuovaCategoria(e.target.value)}
              placeholder="Nome categoria"
              style={{ fontSize: 13, padding: '4px 8px', width: 160 }}
              onKeyDown={(e) => { if (e.key === 'Enter') creaCategoria() }}
            />
            <button type="button" className="btn-mini" disabled={busy} onClick={creaCategoria}>Crea</button>
            <button type="button" className="btn-mini btn-ghost" onClick={() => { setCreandoCategoria(false); setNuovaCategoria('') }}>Annulla</button>
          </span>
        )}
      </div>

      {categorie.length === 0 && (
        <p className="sub-intro">Nessuna categoria ancora per {target === 'allenatore' ? 'allenatori/staff' : 'portieri'}. Creane una con &ldquo;+ Nuova categoria&rdquo;.</p>
      )}

      {categoriaAttiva && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>{categoriaAttiva}</h3>
            <button type="button" className="btn-mini btn-del" onClick={eliminaCategoria}>🗑 Elimina intera categoria</button>
          </div>

          {domandeCategoria.map((f) => <FaqRiga key={f.id} f={f} onChanged={() => router.refresh()} />)}

          <button className="btn-ghost" disabled={busy} onClick={aggiungiDomanda} type="button">+ Nuova domanda in &ldquo;{categoriaAttiva}&rdquo;</button>
        </>
      )}
    </div>
  )
}

function FaqRiga({ f, onChanged }) {
  const [domanda, setDomanda] = useState(f.domanda)
  const [risposta, setRisposta] = useState(f.risposta)
  const [ordine, setOrdine] = useState(f.ordine)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('faq_interne').update({
      domanda: domanda.trim(),
      risposta: risposta.trim(),
      ordine: Number(ordine) || 0,
    }).eq('id', f.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    setBusy(false)
    onChanged()
  }

  async function elimina() {
    if (!confirm('Eliminare questa domanda?')) return
    const supabase = createClient()
    await supabase.from('faq_interne').delete().eq('id', f.id)
    onChanged()
  }

  return (
    <div className="scheda" style={{ marginBottom: 10 }}>
      <div className="form-grid">
        <div className="field" style={{ maxWidth: 90 }}>
          <label>Posizione</label>
          <input type="number" value={ordine} onChange={(e) => { setOrdine(e.target.value); setDone(false) }} />
        </div>
        <div className="field field-full">
          <label>Domanda</label>
          <input value={domanda} onChange={(e) => { setDomanda(e.target.value); setDone(false) }} />
        </div>
        <div className="field field-full">
          <label>Risposta</label>
          <textarea rows="3" value={risposta} onChange={(e) => { setRisposta(e.target.value); setDone(false) }} />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-ghost btn-del" onClick={elimina} type="button">Elimina</button>
        <button className="btn" onClick={salva} disabled={busy} type="button">{busy ? 'Salvataggio...' : done ? 'Salvato ✓' : 'Salva'}</button>
      </div>
    </div>
  )
}
