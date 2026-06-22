'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const GIORNI = ['', 'Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica']
const pad = (n) => String(n).padStart(2, '0')

export default function RicorrenzeManager({ stagione, categorie, ricorrenze }) {
  const router = useRouter()
  const [gen, setGen] = useState('')
  const haRange = !!(stagione?.data_inizio && stagione?.data_fine)

  async function aggiungi(squadraId) {
    const supabase = createClient()
    const { error } = await supabase.from('ricorrenze_stagionali').insert({
      stagione_id: stagione.id, squadra_id: squadraId, giorno_settimana: 1, ora_inizio: '18:00',
    })
    if (error) alert('Errore: ' + error.message)
    router.refresh()
  }

  async function genera() {
    if (!haRange) { alert('Imposta prima data inizio e fine della stagione (Supervisore > Stagioni).'); return }
    if (!ricorrenze.length) { alert('Aggiungi almeno una ricorrenza.'); return }
    if (!confirm('Generare gli allenamenti per tutta la stagione dalle ricorrenze? Le date già presenti non verranno duplicate.')) return
    setGen('working')
    const supabase = createClient()
    try {
      const { data: existing } = await supabase.from('allenamenti').select('data, squadra_id').eq('stagione_id', stagione.id)
      const seen = new Set((existing ?? []).map((a) => a.squadra_id + '|' + a.data))
      const start = new Date(stagione.data_inizio + 'T00:00:00')
      const end = new Date(stagione.data_fine + 'T00:00:00')
      const toInsert = []
      for (const r of ricorrenze) {
        const dow = r.giorno_settimana % 7
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getDay() === dow) {
            const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            const key = r.squadra_id + '|' + ds
            if (!seen.has(key)) { seen.add(key); toInsert.push({ stagione_id: stagione.id, squadra_id: r.squadra_id, data: ds }) }
          }
        }
      }
      if (!toInsert.length) { setGen('Nessun nuovo allenamento da creare (già tutti presenti).'); return }
      for (let i = 0; i < toInsert.length; i += 200) {
        const { error } = await supabase.from('allenamenti').insert(toInsert.slice(i, i + 200))
        if (error) throw error
      }
      setGen(`Creati ${toInsert.length} allenamenti.`); router.refresh()
    } catch (err) { setGen('Errore: ' + err.message) }
  }

  const perCat = (id) => ricorrenze.filter((r) => r.squadra_id === id)

  return (
    <div className="lista-editor">
      <p className="sub-intro">
        Imposta i giorni e orari fissi di allenamento <b>per ogni categoria</b>, poi genera gli allenamenti per tutta la stagione <b>{stagione?.nome ?? '—'}</b>.
        Le date già inserite non vengono duplicate.
      </p>

      {/* Avviso date stagione — compare solo se mancano */}
      {!haRange && (
        <div className="err" style={{ marginBottom: 16 }}>
          ⚠ Imposta <b>data inizio e fine</b> della stagione in <a href="/supervisore/stagioni" className="link-inline">Stagioni</a> per poter generare gli allenamenti.
        </div>
      )}

      {haRange && (
        <div className="ok-msg" style={{ marginBottom: 16 }}>
          Stagione: {new Date(stagione.data_inizio + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} →{' '}
          {new Date(stagione.data_fine + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}

      {categorie.map((c) => {
        const righe = perCat(c.id)
        return (
          <div className="elenco-blocco" key={c.id}>
            <h3>{c.nome}</h3>
            {righe.length === 0 && (
              <p className="sub-intro" style={{ color: 'var(--rosso)', margin: '0 0 8px' }}>
                Nessuna ricorrenza impostata per questa categoria. Clicca &quot;+ Aggiungi giorno&quot; per impostarla qui.
              </p>
            )}
            {righe.map((r) => <RicorrenzaRiga key={r.id} ricorrenza={r} onChanged={() => router.refresh()} />)}
            <button className="btn-ghost" onClick={() => aggiungi(c.id)} type="button">+ Aggiungi giorno</button>
          </div>
        )
      })}

      <div className="form-actions">
        <button className="btn" onClick={genera} disabled={gen === 'working' || !haRange} type="button">
          {gen === 'working' ? 'Generazione...' : 'Genera allenamenti stagione'}
        </button>
      </div>
      {gen && gen !== 'working' && <p className="sub-intro" style={{ marginTop: 8 }}>{gen}</p>}
    </div>
  )
}

function RicorrenzaRiga({ ricorrenza, onChanged }) {
  const [g, setG] = useState(ricorrenza.giorno_settimana)
  const [oi, setOi] = useState(ricorrenza.ora_inizio ? ricorrenza.ora_inizio.slice(0, 5) : '18:00')
  const [ofine, setOfine] = useState(ricorrenza.ora_fine ? ricorrenza.ora_fine.slice(0, 5) : '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('ricorrenze_stagionali').update({
      giorno_settimana: Number(g), ora_inizio: oi || '18:00', ora_fine: ofine || null,
    }).eq('id', ricorrenza.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    setBusy(false); onChanged()
  }
  async function elimina() {
    const supabase = createClient()
    await supabase.from('ricorrenze_stagionali').delete().eq('id', ricorrenza.id)
    onChanged()
  }

  return (
    <div className="lista-riga">
      <select value={g} onChange={(e) => { setG(e.target.value); setDone(false) }}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{GIORNI[n]}</option>)}
      </select>
      <label className="lista-ord">Inizio<input type="time" value={oi} onChange={(e) => { setOi(e.target.value); setDone(false) }} /></label>
      <label className="lista-ord">Fine<input type="time" value={ofine} onChange={(e) => { setOfine(e.target.value); setDone(false) }} /></label>
      <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '✓' : 'Salva'}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>
    </div>
  )
}
