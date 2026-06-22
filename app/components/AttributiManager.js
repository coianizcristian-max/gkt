'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TIPO_LABEL = { numero: '🔢 Numero libero', testo: '📝 Testo libero', scala: '📊 Scala (es. 1-10)' }

function AttributoRiga({ attributo, onChanged }) {
  const [nome, setNome] = useState(attributo.nome)
  const [tipo, setTipo] = useState(attributo.tipo)
  const [scalaMin, setScalaMin] = useState(attributo.scala_min ?? 1)
  const [scalaMax, setScalaMax] = useState(attributo.scala_max ?? 10)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('attributi_definizioni').update({
      nome, tipo,
      scala_min: tipo === 'scala' ? Number(scalaMin) : null,
      scala_max: tipo === 'scala' ? Number(scalaMax) : null,
    }).eq('id', attributo.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    setBusy(false); onChanged()
  }

  async function toggleAttivo() {
    const supabase = createClient()
    await supabase.from('attributi_definizioni').update({ attivo: !attributo.attivo }).eq('id', attributo.id)
    onChanged()
  }

  async function elimina() {
    if (!confirm(`Eliminare l'attributo "${attributo.nome}"? Verranno persi anche tutti i valori già inseriti.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('attributi_definizioni').delete().eq('id', attributo.id)
    if (error) alert('Errore: ' + error.message)
    onChanged()
  }

  return (
    <div className={`lista-riga ${attributo.attivo ? '' : 'assente'}`} style={{ flexWrap: 'wrap', gap: 10 }}>
      <input value={nome} onChange={(e) => { setNome(e.target.value); setDone(false) }}
        style={{ flex: '1 1 160px', minWidth: 120 }} placeholder="Nome attributo" />
      <select value={tipo} onChange={(e) => { setTipo(e.target.value); setDone(false) }} style={{ flex: '0 0 auto' }}>
        {Object.entries(TIPO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {tipo === 'scala' && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          da <input type="number" value={scalaMin} onChange={(e) => { setScalaMin(e.target.value); setDone(false) }} style={{ width: 50 }} />
          a <input type="number" value={scalaMax} onChange={(e) => { setScalaMax(e.target.value); setDone(false) }} style={{ width: 50 }} />
        </span>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <input type="checkbox" checked={attributo.attivo} onChange={toggleAttivo} />
        Attivo
      </label>
      <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '✓' : 'Salva'}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>
    </div>
  )
}

export default function AttributiManager({ attributi }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function aggiungi() {
    setBusy(true)
    const supabase = createClient()
    const maxOrd = attributi.reduce((m, a) => Math.max(m, a.ordine), 0)
    const { error } = await supabase.from('attributi_definizioni').insert({
      nome: 'Nuovo attributo', tipo: 'scala', scala_min: 1, scala_max: 10, ordine: maxOrd + 1,
    })
    if (error) alert('Errore: ' + error.message)
    setBusy(false); router.refresh()
  }

  return (
    <div className="lista-editor">
      <p className="sub-intro">
        Definisci attributi personalizzati per i portieri (es. Leadership, Coraggio, Esplosività).
        Una volta creati, ogni allenatore potrà compilarli nella scheda di ogni portiere.
        Oltre a questi, i campi base (altezza, peso, piede preferito) restano sempre disponibili.
      </p>
      {attributi.length === 0 && <p className="sub-intro">Nessun attributo personalizzato ancora creato.</p>}
      {attributi.map((a) => (
        <AttributoRiga key={a.id} attributo={a} onChanged={() => router.refresh()} />
      ))}
      <button className="btn-ghost" onClick={aggiungi} disabled={busy} type="button">+ Nuovo attributo</button>
    </div>
  )
}
