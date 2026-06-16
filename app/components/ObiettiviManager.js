'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STATI = ['aperto', 'raggiunto', 'sospeso']

export default function ObiettiviManager({ portiereId, stagioneId, obiettivi, sottoByObiettivo }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  return (
    <div className="lista-editor">
      <p className="sub-intro">Obiettivi in stile PNL: definiscili in modo &ldquo;ben formato&rdquo; (in positivo, misurabili, contestualizzati), con scadenze, note e sotto-obiettivi da monitorare.</p>
      {creating
        ? <ObiettivoCard portiereId={portiereId} stagioneId={stagioneId} onSaved={() => { setCreating(false); router.refresh() }} onCancel={() => setCreating(false)} />
        : <button className="btn-azione" onClick={() => setCreating(true)} type="button">+ Nuovo obiettivo</button>}
      {obiettivi.length === 0 && !creating && <div className="empty">Nessun obiettivo impostato.</div>}
      {obiettivi.map((o) => (
        <ObiettivoCard key={o.id} obiettivo={o} sotto={sottoByObiettivo[o.id] ?? []}
          portiereId={portiereId} stagioneId={stagioneId} onSaved={() => router.refresh()} />
      ))}
    </div>
  )
}

function ObiettivoCard({ obiettivo, sotto = [], portiereId, stagioneId, onSaved, onCancel }) {
  const isEdit = !!obiettivo
  const [f, setF] = useState({
    titolo: obiettivo?.titolo ?? '',
    evidenza: obiettivo?.evidenza ?? '',
    contesto: obiettivo?.contesto ?? '',
    risorse: obiettivo?.risorse ?? '',
    ostacoli: obiettivo?.ostacoli ?? '',
    motivazione: obiettivo?.motivazione ?? '',
    scadenza: obiettivo?.scadenza ?? '',
    note: obiettivo?.note ?? '',
    stato: obiettivo?.stato ?? 'aperto',
  })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }

  async function salva() {
    if (!f.titolo.trim()) { setError('Inserisci un titolo.'); return }
    setBusy(true); setError('')
    const supabase = createClient()
    const payload = {
      portiere_id: portiereId, stagione_id: stagioneId ?? null,
      titolo: f.titolo.trim(), evidenza: f.evidenza || null, contesto: f.contesto || null,
      risorse: f.risorse || null, ostacoli: f.ostacoli || null, motivazione: f.motivazione || null,
      scadenza: f.scadenza || null, note: f.note || null, stato: f.stato,
    }
    try {
      if (isEdit) {
        const { error } = await supabase.from('obiettivi').update(payload).eq('id', obiettivo.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('obiettivi').insert(payload)
        if (error) throw error
      }
      setDone(true); setBusy(false); if (onSaved) onSaved()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  async function elimina() {
    if (!confirm('Eliminare questo obiettivo e i suoi sotto-obiettivi?')) return
    const supabase = createClient()
    const { error } = await supabase.from('obiettivi').delete().eq('id', obiettivo.id)
    if (error) alert('Errore: ' + error.message); else if (onSaved) onSaved()
  }

  return (
    <div className={`obiettivo-card stato-${f.stato}`}>
      {error && <div className="err">{error}</div>}
      <div className="form-grid">
        <div className="field field-full"><label>Obiettivo (in positivo): cosa vuoi ottenere? *</label>
          <input value={f.titolo} onChange={upd('titolo')} /></div>
        <div className="field field-full"><label>Come saprai di averlo raggiunto? (evidenze concrete)</label>
          <textarea rows="2" value={f.evidenza} onChange={upd('evidenza')} /></div>
        <div className="field field-full"><label>Dove, quando e con chi? (contesto)</label>
          <textarea rows="2" value={f.contesto} onChange={upd('contesto')} /></div>
        <div className="field field-full"><label>Quali risorse ti servono?</label>
          <textarea rows="2" value={f.risorse} onChange={upd('risorse')} /></div>
        <div className="field field-full"><label>Cosa lo impedisce ora? (ostacoli)</label>
          <textarea rows="2" value={f.ostacoli} onChange={upd('ostacoli')} /></div>
        <div className="field field-full"><label>Perche e importante? (motivazione)</label>
          <textarea rows="2" value={f.motivazione} onChange={upd('motivazione')} /></div>
        <div className="field"><label>Scadenza</label>
          <input type="date" value={f.scadenza} onChange={upd('scadenza')} /></div>
        <div className="field"><label>Stato</label>
          <select value={f.stato} onChange={upd('stato')}>{STATI.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="field field-full"><label>Note</label>
          <textarea rows="2" value={f.note} onChange={upd('note')} /></div>
      </div>

      <div className="form-actions">
        {onCancel && <button className="btn-ghost" onClick={onCancel} type="button">Annulla</button>}
        {isEdit && <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>}
        <button className="btn" onClick={salva} disabled={busy} type="button">{busy ? 'Salvataggio...' : done ? 'Salvato \u2713' : 'Salva obiettivo'}</button>
      </div>

      {isEdit && <SottoObiettivi obiettivoId={obiettivo.id} sotto={sotto} onChanged={onSaved} />}
      {!isEdit && <p className="sub-intro">Salva l&rsquo;obiettivo per aggiungere i sotto-obiettivi.</p>}
    </div>
  )
}

function SottoObiettivi({ obiettivoId, sotto, onChanged }) {
  async function aggiungi() {
    const supabase = createClient()
    const maxOrd = sotto.reduce((m, x) => Math.max(m, x.ordine ?? 0), 0)
    const { error } = await supabase.from('sotto_obiettivi')
      .insert({ obiettivo_id: obiettivoId, descrizione: 'Nuovo sotto-obiettivo', ordine: maxOrd + 1 })
    if (error) alert('Errore: ' + error.message); else if (onChanged) onChanged()
  }
  return (
    <div className="elenco-blocco">
      <h3>Sotto-obiettivi da monitorare</h3>
      {sotto.length === 0 && <p className="sub-intro">Nessun sotto-obiettivo.</p>}
      {sotto.map((so) => <SottoRiga key={so.id} so={so} onChanged={onChanged} />)}
      <button className="btn-ghost" onClick={aggiungi} type="button">+ Aggiungi sotto-obiettivo</button>
    </div>
  )
}

function SottoRiga({ so, onChanged }) {
  const [descrizione, setDescrizione] = useState(so.descrizione)
  const [scadenza, setScadenza] = useState(so.scadenza ?? '')
  const [stato, setStato] = useState(so.stato ?? 'aperto')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('sotto_obiettivi')
      .update({ descrizione, scadenza: scadenza || null, stato }).eq('id', so.id)
    if (error) alert('Errore: ' + error.message); else setDone(true)
    setBusy(false); if (onChanged) onChanged()
  }
  async function elimina() {
    const supabase = createClient()
    await supabase.from('sotto_obiettivi').delete().eq('id', so.id)
    if (onChanged) onChanged()
  }
  return (
    <div className="lista-riga">
      <input className="lista-nome" style={{ flex: 1 }} value={descrizione} onChange={(e) => { setDescrizione(e.target.value); setDone(false) }} />
      <label className="lista-ord">Scadenza<input type="date" value={scadenza} onChange={(e) => { setScadenza(e.target.value); setDone(false) }} /></label>
      <select value={stato} onChange={(e) => { setStato(e.target.value); setDone(false) }}>{STATI.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '\u2713' : 'Salva'}</button>
      <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>
    </div>
  )
}
