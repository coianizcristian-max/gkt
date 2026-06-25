'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NuovoEsercizioModal({ onSaved, onClose }) {
  const [tipologie, setTipologie] = useState([])
  const [allenatoreId, setAllenatoreId] = useState(null)

  useEffect(() => {
    async function carica() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setAllenatoreId(user?.id ?? null)
      const { data: t } = await supabase
        .from('elenco_voci').select('valore').eq('elenco', 'tipologie_esercizio').eq('stato', 'attivo').order('ordine')
      setTipologie((t ?? []).map(r => r.valore))
    }
    carica()
  }, [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Nuovo esercizio</h3>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>
        <div style={{ padding: '0 0 8px' }}>
          {allenatoreId && (
            <EsercizioFormInline
              tipologie={tipologie}
              allenatoreId={allenatoreId}
              onSaved={(esercizio) => { onSaved(esercizio); onClose() }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function EsercizioFormInline({ tipologie, allenatoreId, onSaved, onCancel }) {
  const [f, setF] = useState({
    titolo: '',
    tipologia: tipologie[0] ?? '',
    descrizione_breve: '',
    descrizione: '',
    durata_minuti: '',
    recupero_minuti: '',
    pubblico: false,
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }))

  function onFile(e) {
    const fl = e.target.files?.[0]; if (!fl) return
    setFile(fl); setPreview(URL.createObjectURL(fl))
  }

  function onTip(e) {
    const v = e.target.value
    if (v === '__nuova__') {
      const nome = prompt('Nome della nuova tipologia:')
      if (!nome) return
      const supabase = createClient()
      supabase.from('elenco_voci').insert({
        elenco: 'tipologie_esercizio', valore: nome.trim(), stato: 'proposta',
        proposto_da: allenatoreId, ordine: 999,
      }).then(() => setF(s => ({ ...s, tipologia: nome.trim() })))
    } else {
      setF(s => ({ ...s, tipologia: v }))
    }
  }

  async function salva() {
    if (!f.titolo.trim()) { setError('Inserisci il titolo.'); return }
    setBusy(true); setError('')
    const supabase = createClient()
    try {
      let immagine_url = null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `esercizi/${allenatoreId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('sito').upload(path, file, { upsert: true })
        if (upErr) throw upErr
        immagine_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
      }
      const payload = {
        allenatore_id: allenatoreId,
        titolo: f.titolo.trim(),
        tipologia: f.tipologia || null,
        descrizione_breve: f.descrizione_breve || null,
        descrizione: f.descrizione || null,
        immagine_url,
        pubblico: !!f.pubblico,
        durata_minuti: f.durata_minuti !== '' ? parseFloat(f.durata_minuti) : null,
        recupero_minuti: f.recupero_minuti !== '' ? parseFloat(f.recupero_minuti) : null,
      }
      const { data, error: insErr } = await supabase.from('esercizi').insert(payload).select('id, titolo, tipologia, descrizione_breve, immagine_url, pubblico, allenatore_id, durata_minuti, recupero_minuti').single()
      if (insErr) throw insErr
      if (onSaved) onSaved(data)
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <div style={{ padding: '16px 0 0' }}>
      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="form-grid">
        <div className="field field-full">
          <label>Titolo *</label>
          <input value={f.titolo} onChange={upd('titolo')} placeholder="es. Parate in uscita bassa" autoFocus />
        </div>
        <div className="field">
          <label>Tipologia</label>
          <select value={f.tipologia} onChange={onTip}>
            {tipologie.map(t => <option key={t} value={t}>{t}</option>)}
            <option value="__nuova__">+ Nuova tipologia...</option>
          </select>
        </div>
        <div className="field">
          <label>Durata (min)</label>
          <input type="number" min="0" step="0.5" value={f.durata_minuti} onChange={upd('durata_minuti')} placeholder="es. 15" />
        </div>
        <div className="field">
          <label>Recupero (min)</label>
          <input type="number" min="0" step="0.5" value={f.recupero_minuti} onChange={upd('recupero_minuti')} placeholder="es. 3" />
        </div>
        <div className="field field-full">
          <label>Descrizione breve</label>
          <input value={f.descrizione_breve} onChange={upd('descrizione_breve')} placeholder="Una riga di sintesi" />
        </div>
        <div className="field field-full">
          <label>Descrizione completa</label>
          <textarea rows={3} value={f.descrizione} onChange={upd('descrizione')} placeholder="Descrizione dettagliata dell'esercizio..." />
        </div>
        <div className="field field-full">
          <label>Immagine (opzionale)</label>
          <input type="file" accept="image/*" onChange={onFile} />
          {preview && <img src={preview} alt="" style={{ marginTop: 8, maxHeight: 120, borderRadius: 6, objectFit: 'cover' }} />}
        </div>
        <div className="field field-full">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.pubblico} onChange={e => setF(s => ({ ...s, pubblico: e.target.checked }))} />
            Rendi pubblico (visibile ad altri allenatori nella libreria pubblica)
          </label>
        </div>
      </div>
      <div className="form-actions" style={{ marginTop: 16 }}>
        <button className="btn-ghost" onClick={onCancel} type="button">Annulla</button>
        <button className="btn" onClick={salva} disabled={busy} type="button">
          {busy ? 'Salvataggio...' : '💾 Salva esercizio'}
        </button>
      </div>
    </div>
  )
}
