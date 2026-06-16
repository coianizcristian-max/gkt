'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Etichette leggibili per gli elenchi noti (le chiavi sconosciute mostrano la chiave grezza)
const ETICHETTE = {
  piede: 'Piede preferito',
  scala_voti: 'Scala voti',
  punti_partita: 'Punti partita',
  tipologie_esercizio: 'Tipologie esercizio',
}
const DESCRIZIONI = {
  scala_voti: 'Valori usati ovunque ci siano voti (allenamenti e partite). Etichetta = come appare; Valore = numero usato per le medie.',
  punti_partita: 'Punti portati alla squadra per ogni partita.',
  tipologie_esercizio: 'Categorie di esercizio. Gli allenatori possono proporne di nuove: qui le approvi.',
}
// Elenchi con valore numerico associato (per medie/punti)
const NUMERICHE = new Set(['scala_voti', 'punti_partita'])

export default function ElenchiManager({ gruppi }) {
  const router = useRouter()
  const chiavi = Object.keys(gruppi)

  async function aggiungiVoce(elenco) {
    const supabase = createClient()
    const voci = gruppi[elenco]
    const maxOrd = voci.reduce((m, v) => Math.max(m, v.ordine), 0)
    const riga = { elenco, valore: 'Nuova voce', ordine: maxOrd + 1 }
    if (NUMERICHE.has(elenco)) riga.valore_num = 0
    const { error } = await supabase.from('elenco_voci').insert(riga)
    if (error) alert('Errore: ' + error.message)
    router.refresh()
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">Gestisci i valori dei menu a tendina. Le modifiche si applicano subito ai campi del sito.</p>
      {chiavi.map((k) => (
        <div className="elenco-blocco" key={k}>
          <h3>{ETICHETTE[k] ?? k}</h3>
          {DESCRIZIONI[k] && <p className="sub-intro">{DESCRIZIONI[k]}</p>}
          {gruppi[k].map((v) => (
            <VoceRiga key={v.id} voce={v} numerica={NUMERICHE.has(k)} onChanged={() => router.refresh()} />
          ))}
          <button className="btn-ghost" onClick={() => aggiungiVoce(k)} type="button">+ Aggiungi voce</button>
        </div>
      ))}
    </div>
  )
}

function VoceRiga({ voce, numerica, onChanged }) {
  const [valore, setValore] = useState(voce.valore)
  const [valoreNum, setValoreNum] = useState(voce.valore_num ?? '')
  const [ordine, setOrdine] = useState(voce.ordine)
  const [attivo, setAttivo] = useState(voce.attivo)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const proposta = voce.stato === 'proposta'

  async function salva(extra = {}) {
    setBusy(true)
    const supabase = createClient()
    const patch = { valore, ordine: Number(ordine) || 0, attivo, ...extra }
    if (numerica) patch.valore_num = valoreNum === '' ? null : Number(valoreNum)
    const { error } = await supabase.from('elenco_voci').update(patch).eq('id', voce.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    setBusy(false); onChanged()
  }

  async function approva() {
    await salva({ stato: 'standard' })
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
      {numerica && (
        <label className="lista-ord">Valore
          <input type="number" step="0.01" value={valoreNum}
            onChange={(e) => { setValoreNum(e.target.value); setDone(false) }} />
        </label>
      )}
      <label className="lista-ord">Ordine
        <input type="number" value={ordine} onChange={(e) => { setOrdine(e.target.value); setDone(false) }} />
      </label>
      <label className="lista-attiva">
        <input type="checkbox" checked={attivo} onChange={(e) => { setAttivo(e.target.checked); setDone(false) }} /> Attiva
      </label>
      {proposta && <span className="badge-proposta">Proposta</span>}
      {proposta && <button className="btn-mini" onClick={approva} disabled={busy} type="button">Approva</button>}
      <button className="btn-mini" onClick={() => salva()} disabled={busy} type="button">{done ? '\u2713' : 'Salva'}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>
    </div>
  )
}
