'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EserciziManager({ esercizi, tipologie, allenatoreId }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const gruppi = {}
  for (const e of esercizi) (gruppi[e.tipologia || 'Senza tipologia'] ??= []).push(e)
  const chiavi = Object.keys(gruppi).sort()

  return (
    <div className="lista-editor">
      <p className="sub-intro">La tua libreria di esercizi: titolo, tipologia, descrizioni, immagine e note. Potrai richiamarli quando crei un allenamento.</p>
      {creating
        ? <EsercizioCard tipologie={tipologie} allenatoreId={allenatoreId} onSaved={() => { setCreating(false); router.refresh() }} onCancel={() => setCreating(false)} />
        : <button className="btn-azione" onClick={() => setCreating(true)} type="button">+ Nuovo esercizio</button>}
      {esercizi.length === 0 && !creating && <div className="empty">Nessun esercizio in libreria.</div>}
      {chiavi.map((k) => (
        <div className="elenco-blocco" key={k}>
          <h3>{k}</h3>
          {gruppi[k].map((e) => (
            <EsercizioCard key={e.id} esercizio={e} tipologie={tipologie} allenatoreId={allenatoreId} onSaved={() => router.refresh()} />
          ))}
        </div>
      ))}
    </div>
  )
}

function EsercizioCard({ esercizio, tipologie, allenatoreId, onSaved, onCancel }) {
  const isEdit = !!esercizio
  const [f, setF] = useState({
    titolo: esercizio?.titolo ?? '',
    tipologia: esercizio?.tipologia ?? (tipologie[0] ?? ''),
    descrizione_breve: esercizio?.descrizione_breve ?? '',
    descrizione: esercizio?.descrizione ?? '',
    note: esercizio?.note ?? '',
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(esercizio?.immagine_url ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }

  function onFile(e) {
    const fl = e.target.files?.[0]; if (!fl) return
    setFile(fl); setPreview(URL.createObjectURL(fl)); setDone(false)
  }
  function onTip(e) {
    const v = e.target.value
    if (v === '__nuova__') {
      const nome = prompt('Nuova tipologia (verra proposta al supervisore per approvazione):')
      if (!nome) return
      const supabase = createClient()
      supabase.from('elenco_voci').insert({
        elenco: 'tipologie_esercizio', valore: nome.trim(), stato: 'proposta', proposto_da: allenatoreId, ordine: 999,
      }).then(() => setF((s) => ({ ...s, tipologia: nome.trim() })))
    } else {
      setF((s) => ({ ...s, tipologia: v }))
    }
    setDone(false)
  }

  async function salva() {
    if (!f.titolo.trim()) { setError('Inserisci il titolo.'); return }
    setBusy(true); setError('')
    const supabase = createClient()
    try {
      let immagine_url = esercizio?.immagine_url ?? null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `esercizi/${allenatoreId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('sito').upload(path, file, { upsert: true })
        if (upErr) throw upErr
        immagine_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
      }
      const payload = {
        allenatore_id: allenatoreId, titolo: f.titolo.trim(), tipologia: f.tipologia || null,
        descrizione_breve: f.descrizione_breve || null, descrizione: f.descrizione || null,
        note: f.note || null, immagine_url,
      }
      if (isEdit) {
        const { error } = await supabase.from('esercizi').update(payload).eq('id', esercizio.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('esercizi').insert(payload)
        if (error) throw error
      }
      setDone(true); setBusy(false); if (onSaved) onSaved()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  async function elimina() {
    if (!confirm('Eliminare questo esercizio?')) return
    const supabase = createClient()
    const { error } = await supabase.from('esercizi').delete().eq('id', esercizio.id)
    if (error) alert('Errore: ' + error.message); else if (onSaved) onSaved()
  }

  return (
    <div className="esercizio-card">
      {error && <div className="err">{error}</div>}
      <div className="form-grid">
        <div className="field field-full"><label>Titolo *</label><input value={f.titolo} onChange={upd('titolo')} /></div>
        <div className="field"><label>Tipologia</label>
          <select value={f.tipologia} onChange={onTip}>
            {tipologie.map((t) => <option key={t} value={t}>{t}</option>)}
            <option value="__nuova__">+ Proponi nuova...</option>
          </select></div>
        <div className="field"><label>Immagine</label>
          <label className="foto-upload">{preview ? 'Cambia immagine' : 'Carica immagine'}<input type="file" accept="image/*" onChange={onFile} hidden /></label></div>
        <div className="field field-full"><label>Descrizione breve</label><input value={f.descrizione_breve} onChange={upd('descrizione_breve')} /></div>
        <div className="field field-full"><label>Descrizione dettagliata</label><textarea rows="3" value={f.descrizione} onChange={upd('descrizione')} /></div>
        <div className="field field-full"><label>Note</label><textarea rows="2" value={f.note} onChange={upd('note')} /></div>
      </div>
      {preview && <div className="esercizio-img"><img src={preview} alt="" /></div>}
      <div className="form-actions">
        {onCancel && <button className="btn-ghost" onClick={onCancel} type="button">Annulla</button>}
        {isEdit && <button className="btn-mini btn-del" onClick={elimina} type="button">Elimina</button>}
        <button className="btn" onClick={salva} disabled={busy} type="button">{busy ? 'Salvataggio...' : done ? 'Salvato \u2713' : 'Salva'}</button>
      </div>
    </div>
  )
}
