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

      {/* ── Eliminazione massiva ── */}
      <EliminazioneRapida stagione={stagione} categorie={categorie} />
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

// ─── Eliminazione massiva allenamenti / partite ───────────────────────────────
function EliminazioneRapida({ stagione, categorie }) {
  const router = useRouter()
  const [tipo, setTipo] = useState('allenamenti') // 'allenamenti' | 'partite'
  const [dal, setDal] = useState('')
  const [al, setAl] = useState('')
  const [categoriaId, setCategoriaId] = useState('tutte')
  const [filtroVal, setFiltroVal] = useState('tutti') // 'tutti' | 'senza' | 'con'
  const [busy, setBusy] = useState(false)
  const [risultato, setRisultato] = useState(null)
  const [errore, setErrore] = useState('')

  const tipoLabel = tipo === 'allenamenti' ? 'allenamenti' : 'partite'

  const filtroValLabel = {
    tutti: 'tutti',
    senza: 'solo quelli senza valutazioni',
    con: 'solo quelli con valutazioni',
  }[filtroVal]

  async function elimina() {
    if (!dal || !al) { setErrore('Seleziona entrambe le date.'); return }
    if (dal > al) { setErrore('La data "dal" deve essere precedente alla data "al".'); return }

    const catLabel = categoriaId === 'tutte'
      ? 'tutte le categorie'
      : `la categoria "${categorie.find(c => c.id === categoriaId)?.nome ?? categoriaId}"`

    const dalLabel = new Date(dal + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    const alLabel = new Date(al + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

    const confermato = window.confirm(
      `⚠️ Sei sicuro di voler eliminare i ${tipoLabel} dal ${dalLabel} al ${alLabel} per ${catLabel}?\n` +
      `Filtro: ${filtroValLabel}.\n\n` +
      `Questa operazione è irreversibile e non può essere annullata.`
    )
    if (!confermato) return

    setBusy(true); setErrore(''); setRisultato(null)
    try {
      const res = await fetch('/api/elimina-massiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, dal, al, categoriaId, stagioneId: stagione.id, filtroVal }),
      })
      const body = await res.json()
      if (!res.ok) { setErrore(body.error ?? 'Errore.'); setBusy(false); return }
      setRisultato(body.eliminati)
      router.refresh()
    } catch (e) { setErrore('Errore di rete.') }
    setBusy(false)
  }

  return (
    <div className="scheda" style={{ marginTop: 28, borderTop: '2px solid var(--linea)', paddingTop: 24 }}>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>🗑 Eliminazione massiva</h3>
      <p className="sub-intro" style={{ marginBottom: 16 }}>
        Elimina in blocco allenamenti o partite in un intervallo di date, per tutte le categorie o una sola.
        Puoi scegliere di eliminare solo quelli <strong>senza valutazioni</strong> (utile se hai inserito per errore date sbagliate)
        oppure solo quelli <strong>con valutazioni</strong>.
      </p>

      {errore && <div className="err" style={{ marginBottom: 12 }}>{errore}</div>}
      {risultato != null && (
        <div className="ok-msg" style={{ marginBottom: 12 }}>
          ✅ Eliminati {risultato} {tipoLabel}.
        </div>
      )}

      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {/* Tipo */}
        <div className="field" style={{ margin: 0 }}>
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => { setTipo(e.target.value); setRisultato(null) }}>
            <option value="allenamenti">Allenamenti</option>
            <option value="partite">Partite</option>
          </select>
        </div>

        {/* Categoria */}
        <div className="field" style={{ margin: 0 }}>
          <label>Categoria</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="tutte">Tutte le categorie</option>
            {categorie.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        {/* Filtro valutazioni */}
        <div className="field" style={{ margin: 0 }}>
          <label>Valutazioni</label>
          <select value={filtroVal} onChange={(e) => { setFiltroVal(e.target.value); setRisultato(null) }}>
            <option value="tutti">Tutti</option>
            <option value="senza">Solo senza valutazioni</option>
            <option value="con">Solo con valutazioni</option>
          </select>
        </div>

        {/* Dal */}
        <div className="field" style={{ margin: 0 }}>
          <label>Dal</label>
          <input type="date" value={dal} onChange={(e) => setDal(e.target.value)} />
        </div>

        {/* Al */}
        <div className="field" style={{ margin: 0 }}>
          <label>Al</label>
          <input type="date" value={al} onChange={(e) => setAl(e.target.value)} />
        </div>
      </div>

      <button
        className="btn-ghost btn-del"
        onClick={elimina}
        disabled={busy || !dal || !al}
        type="button"
        style={{ minWidth: 220 }}
      >
        {busy ? 'Eliminazione in corso...' : `🗑 Elimina ${tipoLabel} selezionati`}
      </button>
    </div>
  )
}
