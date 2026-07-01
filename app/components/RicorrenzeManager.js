'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const GIORNI = ['', 'Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato', 'Domenica']
const pad = (n) => String(n).padStart(2, '0')
const toDs = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function RicorrenzeManager({ stagione, categorie, ricorrenze }) {
  const router = useRouter()
  const [gen, setGen] = useState('')
  const haRange = !!(stagione?.data_inizio && stagione?.data_fine)

  async function aggiungi(squadraId) {
    const supabase = createClient()
    const { error } = await supabase.from('ricorrenze_stagionali').insert({
      stagione_id: stagione.id, squadra_id: squadraId,
      giorno_settimana: 1, ora_inizio: '18:00',
      data_inizio_ric: null, data_fine_ric: null,
    })
    if (error) alert('Errore: ' + error.message)
    router.refresh()
  }

  async function genera() {
    if (!haRange) { alert('Imposta prima data inizio e fine della stagione in Stagioni.'); return }
    if (!ricorrenze.length) { alert('Aggiungi almeno una ricorrenza.'); return }
    if (!confirm('Generare/aggiornare gli allenamenti dalle ricorrenze?\n\nGli allenamenti già presenti verranno aggiornati se hai cambiato orario o accorpamento. Quelli nuovi verranno aggiunti.')) return
    setGen('working')
    const supabase = createClient()
    try {
      const stagStart = new Date(stagione.data_inizio + 'T00:00:00')
      const stagEnd   = new Date(stagione.data_fine   + 'T00:00:00')

      // Leggo tutti gli allenamenti esistenti
      const { data: existing } = await supabase
        .from('allenamenti').select('id, data, squadra_id, ora_inizio, accorpata_con')
        .eq('stagione_id', stagione.id)
      const existMap = {}
      for (const a of (existing ?? [])) existMap[a.squadra_id + '|' + a.data] = a

      // Piano: per ogni data, quali categorie hanno allenamento e con quale ricorrenza
      // piano[ds][squadra_id] = ricorrenza
      const piano = {}
      for (const r of ricorrenze) {
        const dow    = r.giorno_settimana % 7
        const rStart = r.data_inizio_ric ? new Date(r.data_inizio_ric + 'T00:00:00') : new Date(stagStart)
        const rEnd   = r.data_fine_ric   ? new Date(r.data_fine_ric   + 'T00:00:00') : new Date(stagEnd)
        const start  = rStart < stagStart ? new Date(stagStart) : rStart
        const end    = rEnd   > stagEnd   ? new Date(stagEnd)   : rEnd
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getDay() === dow) {
            const ds = toDs(d)
            if (!piano[ds]) piano[ds] = {}
            piano[ds][r.squadra_id] = r
          }
        }
      }

      // Per ogni allenamento pianificato: accorpamento valido solo se anche l'altra cat ha allenamento quella data
      const toInsert = []
      const toUpdate = []
      for (const [ds, catMap] of Object.entries(piano)) {
        for (const [squadraId, r] of Object.entries(catMap)) {
          // Accorpamento: valido solo se l'altra categoria è presente nel piano quella stessa data
          let accorpataCon = null
          if (r.accorpata_con && catMap[r.accorpata_con]) accorpataCon = r.accorpata_con

          const key      = squadraId + '|' + ds
          const esistente = existMap[key]
          const oraTarget = r.ora_inizio || '18:00'

          if (esistente) {
            const oraChanged = oraTarget !== (esistente.ora_inizio || '18:00')
            const accChanged = accorpataCon !== (esistente.accorpata_con ?? null)
            if (oraChanged || accChanged) toUpdate.push({ id: esistente.id, ora_inizio: oraTarget, accorpata_con: accorpataCon })
          } else {
            toInsert.push({ stagione_id: stagione.id, squadra_id: squadraId, data: ds, ora_inizio: oraTarget, accorpata_con: accorpataCon })
          }
        }
      }

      let inseriti = 0
      for (let i = 0; i < toInsert.length; i += 200) {
        const { error } = await supabase.from('allenamenti').insert(toInsert.slice(i, i + 200))
        if (error) throw error
        inseriti += Math.min(200, toInsert.length - i)
      }
      let aggiornati = 0
      for (const u of toUpdate) {
        const { error } = await supabase.from('allenamenti')
          .update({ ora_inizio: u.ora_inizio, accorpata_con: u.accorpata_con }).eq('id', u.id)
        if (!error) aggiornati++
      }

      const msg = []
      if (inseriti   > 0) msg.push(`Creati ${inseriti} allenamenti`)
      if (aggiornati > 0) msg.push(`Aggiornati ${aggiornati} allenamenti`)
      if (!msg.length)    msg.push('Nessuna modifica necessaria (tutto già aggiornato)')
      setGen(msg.join(' · ') + '.')
      router.refresh()
    } catch (err) { setGen('Errore: ' + err.message) }
  }

  const perCat = (id) => ricorrenze.filter((r) => r.squadra_id === id)

  return (
    <div className="lista-editor">
      <p className="sub-intro">
        Imposta i giorni e orari fissi per ogni categoria. Puoi specificare date di inizio/fine diverse dal range
        della stagione (es. gli Allievi iniziano a settembre). L&apos;accorpamento è attivo{' '}
        <b>solo nelle date in cui entrambe le categorie hanno allenamento</b>.
      </p>

      {!haRange && (
        <div className="err" style={{ marginBottom: 16 }}>
          ⚠ Imposta <b>data inizio e fine</b> della stagione in{' '}
          <a href="/stagioni" className="link-inline">Le mie stagioni</a> per poter generare gli allenamenti.
        </div>
      )}

      {haRange && (
        <div className="ok-msg" style={{ marginBottom: 16 }}>
          Stagione:{' '}
          {new Date(stagione.data_inizio + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          {' → '}
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
                Nessuna ricorrenza impostata. Clicca &quot;+ Aggiungi giorno&quot;.
              </p>
            )}
            {righe.map((r) => (
              <RicorrenzaRiga key={r.id} ricorrenza={r} categorie={categorie} stagione={stagione} onChanged={() => router.refresh()} />
            ))}
            <button className="btn-ghost" onClick={() => aggiungi(c.id)} type="button">+ Aggiungi giorno</button>
          </div>
        )
      })}

      <div className="form-actions">
        <button className="btn" onClick={genera} disabled={gen === 'working' || !haRange} type="button">
          {gen === 'working' ? 'Generazione...' : 'Genera / Aggiorna allenamenti stagione'}
        </button>
      </div>
      {gen && gen !== 'working' && <p className="sub-intro" style={{ marginTop: 8 }}>{gen}</p>}
    </div>
  )
}

function RicorrenzaRiga({ ricorrenza, categorie, stagione, onChanged }) {
  const [g,          setG]          = useState(ricorrenza.giorno_settimana)
  const [oi,         setOi]         = useState(ricorrenza.ora_inizio?.slice(0, 5) ?? '18:00')
  const [ofine,      setOfine]      = useState(ricorrenza.ora_fine?.slice(0, 5) ?? '')
  const [accorpaCon, setAccorpaCon] = useState(ricorrenza.accorpata_con ?? '')
  const [dStart,     setDStart]     = useState(ricorrenza.data_inizio_ric ?? '')
  const [dEnd,       setDEnd]       = useState(ricorrenza.data_fine_ric   ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const ch = () => setDone(false)

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('ricorrenze_stagionali').update({
      giorno_settimana: Number(g),
      ora_inizio: oi || '18:00',
      ora_fine: ofine || null,
      accorpata_con: accorpaCon || null,
      data_inizio_ric: dStart || null,
      data_fine_ric:   dEnd   || null,
    }).eq('id', ricorrenza.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    setBusy(false); onChanged()
  }

  async function elimina() {
    if (!confirm('Eliminare questa ricorrenza? Gli allenamenti già generati non verranno toccati.')) return
    const supabase = createClient()
    await supabase.from('ricorrenze_stagionali').delete().eq('id', ricorrenza.id)
    onChanged()
  }

  const nomeAccorpata = categorie.find(c => c.id === accorpaCon)?.nome ?? ''

  return (
    <div className="lista-riga" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span style={{ fontSize:11, color:'var(--ink-soft)' }}>Giorno</span>
        <select value={g} onChange={(e) => { setG(e.target.value); ch() }}>
          {[1,2,3,4,5,6,7].map((n) => <option key={n} value={n}>{GIORNI[n]}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span style={{ fontSize:11, color:'var(--ink-soft)' }}>Inizio</span>
        <input type="time" value={oi} onChange={(e) => { setOi(e.target.value); ch() }} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span style={{ fontSize:11, color:'var(--ink-soft)' }}>Fine</span>
        <input type="time" value={ofine} onChange={(e) => { setOfine(e.target.value); ch() }} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span style={{ fontSize:11, color:'var(--ink-soft)' }}>Dal (ricorrenza)</span>
        <input type="date" value={dStart} min={stagione?.data_inizio ?? ''} max={stagione?.data_fine ?? ''}
          onChange={(e) => { setDStart(e.target.value); ch() }} style={{ width:130 }} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span style={{ fontSize:11, color:'var(--ink-soft)' }}>Al (ricorrenza)</span>
        <input type="date" value={dEnd} min={stagione?.data_inizio ?? ''} max={stagione?.data_fine ?? ''}
          onChange={(e) => { setDEnd(e.target.value); ch() }} style={{ width:130 }} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        <span style={{ fontSize:11, color:'var(--ink-soft)' }}>Accorpa con</span>
        <select value={accorpaCon} onChange={(e) => { setAccorpaCon(e.target.value); ch() }} style={{ maxWidth:160 }}>
          <option value="">— Nessuna —</option>
          {(categorie ?? []).filter(c => c.id !== ricorrenza.squadra_id).map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      <div style={{ display:'flex', gap:4, alignSelf:'flex-end' }}>
        <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '✓' : 'Salva'}</button>
        <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>
      </div>
      {accorpaCon && (
        <p style={{ width:'100%', margin:'4px 0 0', fontSize:11, color:'var(--giallo)' }}>
          ⚠ Accorpamento attivo solo nelle date in cui anche <b>{nomeAccorpata}</b> ha allenamento nella stessa data.
        </p>
      )}
    </div>
  )
}

export function EliminazioneRapida({ stagione, categorie }) {
  const router = useRouter()
  const [tipo,        setTipo]        = useState('allenamenti')
  const [dal,         setDal]         = useState('')
  const [al,          setAl]          = useState('')
  const [categoriaId, setCategoriaId] = useState('tutte')
  const [filtroVal,   setFiltroVal]   = useState('tutti')
  const [busy,        setBusy]        = useState(false)
  const [risultato,   setRisultato]   = useState(null)
  const [errore,      setErrore]      = useState('')
  const tipoLabel = tipo === 'allenamenti' ? 'allenamenti' : 'partite'
  const filtroValLabel = { tutti:'tutti', senza:'solo quelli senza valutazioni', con:'solo quelli con valutazioni' }[filtroVal]

  async function elimina() {
    if (!dal || !al) { setErrore('Seleziona entrambe le date.'); return }
    if (dal > al)    { setErrore('La data "dal" deve essere precedente alla data "al".'); return }
    const catLabel = categoriaId === 'tutte' ? 'tutte le categorie' : `la categoria "${categorie.find(c => c.id === categoriaId)?.nome ?? categoriaId}"`
    const dalLabel = new Date(dal + 'T00:00:00').toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' })
    const alLabel  = new Date(al  + 'T00:00:00').toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' })
    if (!window.confirm(`⚠️ Elimina i ${tipoLabel} dal ${dalLabel} al ${alLabel} per ${catLabel}?\nFiltro: ${filtroValLabel}.\n\nOperazione irreversibile.`)) return
    setBusy(true); setErrore(''); setRisultato(null)
    try {
      const res = await fetch('/api/elimina-massiva', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tipo, dal, al, categoriaId, stagioneId: stagione.id, filtroVal }),
      })
      const body = await res.json()
      if (!res.ok) { setErrore(body.error ?? 'Errore.'); setBusy(false); return }
      setRisultato(body.eliminati); router.refresh()
    } catch { setErrore('Errore di rete.') }
    setBusy(false)
  }

  return (
    <div className="scheda" style={{ marginTop:28, borderTop:'2px solid var(--linea)', paddingTop:24 }}>
      <h3 style={{ marginTop:0, marginBottom:4 }}>🗑 Eliminazione massiva</h3>
      <p className="sub-intro" style={{ marginBottom:16 }}>
        Elimina in blocco allenamenti o partite in un intervallo di date, filtrando per categoria e valutazioni.
      </p>
      {errore && <div className="err" style={{ marginBottom:12 }}>{errore}</div>}
      {risultato != null && <div className="ok-msg" style={{ marginBottom:12 }}>✅ Eliminati {risultato} {tipoLabel}.</div>}
      <div className="form-grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:16 }}>
        <div className="field" style={{ margin:0 }}>
          <label>Tipo</label>
          <select value={tipo} onChange={(e) => { setTipo(e.target.value); setRisultato(null) }}>
            <option value="allenamenti">Allenamenti</option>
            <option value="partite">Partite</option>
          </select>
        </div>
        <div className="field" style={{ margin:0 }}>
          <label>Categoria</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="tutte">Tutte le categorie</option>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin:0 }}>
          <label>Valutazioni</label>
          <select value={filtroVal} onChange={(e) => { setFiltroVal(e.target.value); setRisultato(null) }}>
            <option value="tutti">Tutti</option>
            <option value="senza">Solo senza valutazioni</option>
            <option value="con">Solo con valutazioni</option>
          </select>
        </div>
        <div className="field" style={{ margin:0 }}>
          <label>Dal</label>
          <input type="date" value={dal} onChange={(e) => setDal(e.target.value)} />
        </div>
        <div className="field" style={{ margin:0 }}>
          <label>Al</label>
          <input type="date" value={al} onChange={(e) => setAl(e.target.value)} />
        </div>
      </div>
      <button className="btn-ghost btn-del" onClick={elimina} disabled={busy || !dal || !al} type="button" style={{ minWidth:220 }}>
        {busy ? 'Eliminazione in corso...' : `🗑 Elimina ${tipoLabel} selezionati`}
      </button>
    </div>
  )
}
