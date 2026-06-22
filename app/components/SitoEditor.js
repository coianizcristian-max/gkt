'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { renderTesto } from '@/lib/renderTesto'

const TIPI = [
  { v: 'hero', l: 'Hero (testata grande)' },
  { v: 'vantaggio', l: 'Vantaggio (riquadro)' },
  { v: 'contenuto', l: 'Contenuto (blocco testo + foto)' },
]

function SezioneCard({ sezione, onChanged }) {
  const router = useRouter()
  const [s, setS] = useState(sezione)
  // Teniamo il file separato dall'URL — così se non si ricarica la foto il vecchio URL resta intatto
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(sezione.immagine_url || '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const upd = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setS((p) => ({ ...p, [k]: val })); setDone(false)
  }
  function onFile(e) {
    const fl = e.target.files?.[0]; if (!fl) return
    setFile(fl); setPreview(URL.createObjectURL(fl)); setDone(false)
  }

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    try {
      // BUG FIX: immagine_url parte sempre dal valore DB (s.immagine_url),
      // e viene sovrascritto SOLO se l'utente ha scelto un nuovo file.
      // Questo evita che salva senza file azzeri l'URL già salvato.
      let immagine_url = s.immagine_url ?? null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `sez/${s.id}/${Date.now()}.${ext}`
        const { error: e1 } = await supabase.storage.from('sito').upload(path, file, { upsert: true })
        if (e1) throw e1
        immagine_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
        setS((p) => ({ ...p, immagine_url })) // aggiorna stato locale con nuovo URL
      }
      const { error } = await supabase.from('sito_sezioni').update({
        tipo: s.tipo, ordine: Number(s.ordine) || 0, visibile: s.visibile,
        titolo: s.titolo || null, testo: s.testo || null, immagine_url,
      }).eq('id', s.id)
      if (error) throw error
      setFile(null); setDone(true); router.refresh()
    } catch (err) { alert('Errore: ' + (err.message || err)) }
    setBusy(false)
  }

  async function elimina() {
    if (!confirm('Eliminare questa sezione?')) return
    const supabase = createClient()
    const { error } = await supabase.from('sito_sezioni').delete().eq('id', s.id)
    if (error) { alert('Errore: ' + error.message); return }
    onChanged()
  }

  const dimConsigliate = s.tipo === 'hero' ? '1400×600 px' : s.tipo === 'contenuto' ? '800×600 px' : '400×300 px'

  return (
    <div className="sez-card">
      <div className="sez-head">
        <select value={s.tipo} onChange={upd('tipo')}>
          {TIPI.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <label className="sez-vis">
          <input type="checkbox" checked={s.visibile} onChange={upd('visibile')} /> Visibile
        </label>
        <label className="sez-ord">Ordine
          <input type="number" value={s.ordine} onChange={upd('ordine')} />
        </label>
      </div>
      <div className="field"><label>Titolo</label>
        <input value={s.titolo ?? ''} onChange={upd('titolo')} />
      </div>
      <div className="field">
        <label>
          Testo
          <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--ink-soft)', marginLeft: 8 }}>
            Usa **parola** per il <strong>grassetto</strong> · Invio = a capo nel testo pubblicato
          </span>
        </label>
        <textarea rows="5" value={s.testo ?? ''} onChange={upd('testo')} style={{ fontFamily: 'monospace', fontSize: 13 }} />
      </div>
      <div className="sez-img">
        <div className="sez-thumb">
          {preview ? <img src={preview} alt="" /> : <span>nessuna immagine</span>}
        </div>
        <div>
          <label className="foto-upload">
            {preview ? 'Cambia immagine' : 'Carica immagine'}
            <input type="file" accept="image/*" onChange={onFile} hidden />
          </label>
          <p style={{ fontSize: 11, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
            Dimensioni consigliate: <b>{dimConsigliate}</b>
          </p>
        </div>
      </div>
      <div className="sez-actions">
        <button className="btn-ghost btn-del" onClick={elimina} type="button">Elimina</button>
        <button className="btn" onClick={salva} disabled={busy} type="button">
          {busy ? 'Salvataggio…' : done ? 'Salvato ✓' : 'Salva'}
        </button>
      </div>
    </div>
  )
}

export default function SitoEditor({ sezioni }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)

  async function aggiungi(tipo) {
    setAdding(true)
    const supabase = createClient()
    const maxOrd = sezioni.reduce((m, s) => Math.max(m, s.ordine), 0)
    const { error } = await supabase.from('sito_sezioni').insert({
      tipo, ordine: maxOrd + 1, titolo: 'Nuova sezione', testo: '', visibile: true,
    })
    if (error) alert('Errore: ' + error.message)
    setAdding(false)
    router.refresh()
  }

  return (
    <div className="sito-editor">
      {sezioni.map((sez) => (
        <SezioneCard key={sez.id} sezione={sez} onChanged={() => router.refresh()} />
      ))}
      <div className="add-sez">
        <span>Aggiungi sezione:</span>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('vantaggio')} type="button">+ Vantaggio</button>
        <button className="btn-ghost" disabled={adding} onClick={() => aggiungi('contenuto')} type="button">+ Contenuto</button>
      </div>
    </div>
  )
}
