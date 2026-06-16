'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ETICHETTE = { piede: 'Piede preferito' }

export default function ElenchiManager({ gruppi }) {
  const router = useRouter()
  const chiavi = Object.keys(gruppi)

  async function aggiungiVoce(elenco) {
    const supabase = createClient()
    const voci = gruppi[elenco]
    const maxOrd = voci.reduce((m, v) => Math.max(m, v.ordine), 0)
    const { error } = await supabase.from('elenco_voci')
      .insert({ elenco, valore: 'Nuova voce', ordine: maxOrd + 1 })
    if (error) alert('Errore: ' + error.message)
    router.refresh()
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">Gestisci i valori dei menù a tendina semplici. Le modifiche si applicano subito ai campi del sito.</p>
      {chiavi.map((k) => (
        <div className="elenco-blocco" key={k}>
          <h3>{ETICHETTE[k] ?? k}</h3>
          {gruppi[k].map((v) => <VoceRiga key={v.id} voce={v} onChanged={() => router.refresh()} />)}
          <button className="btn-ghost" onClick={() => aggiungiVoce(k)} type="button">+ Aggiungi voce</button>
        </div>
      ))}
    </div>
  )
}

function VoceRiga({ voce, onChanged }) {
  const [valore, setValore] = useState(voce.valore)
  const [ordine, setOrdine] = useState(voce.ordine)
  const [attivo, setAttivo] = useState(voce.attivo)
  const [done, setDone] = useState(false)

  async function salva() {
    const supabase = createClient()
    const { error } = await supabase.from('elenco_voci')
      .update({ valore, ordine: Number(ordine) || 0, attivo }).eq('id', voce.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    onChanged()
  }
  async function elimina() {
    if (!confirm(`Eliminare "${voce.valore}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('elenco_voci').delete().eq('id', voce.id)
    if (error) alert('Errore: ' + error.message)
    onChanged()
  }

  return (
    <div className="lista-riga">
      <input className="lista-nome" value={valore} onChange={(e) => { setValore(e.target.value); setDone(false) }} />
      <label className="lista-ord">Ordine
        <input type="number" value={ordine} onChange={(e) => { setOrdine(e.target.value); setDone(false) }} />
      </label>
      <label className="lista-attiva">
        <input type="checkbox" checked={attivo} onChange={(e) => { setAttivo(e.target.checked); setDone(false) }} /> Attiva
      </label>
      <button className="btn-mini" onClick={salva} type="button">{done ? '✓' : 'Salva'}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>
    </div>
  )
}
