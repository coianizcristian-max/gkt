'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TIPI = [
  { v: 'hero', l: 'Hero (testata grande)' },
  { v: 'vantaggio', l: 'Vantaggio (riquadro)' },
  { v: 'contenuto', l: 'Contenuto (blocco testo + foto)' },
]

function SezioneCard({ sezione, onChanged }) {
  const router = useRouter()
  const [s, setS] = useState(sezione)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(sezione.immagine_url)
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
      let immagine_url = s.immagine_url
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${s.id}/${Date.now()}.${ext}`
        const { error: e1 } = await supabase.storage.from('sito').upload(path, file, { upsert: true })
        if (e1) throw e1
        immagine_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
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
        <input value={s.titolo ?? ''} onChange={upd('titolo')} /></div>
      <div className="field"><label>Testo</label>
        <textarea rows="3" value={s.testo ?? ''} onChange={upd('testo')} /></div>
      <div className="sez-img">
        <div className="sez-thumb">
          {preview ? <img src={preview} alt="" /> : <span>nessuna immagine</span>}
        </div>
        <label className="foto-upload">Immagine<input type="file" accept="image/*" onChange={onFile} hidden /></label>
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
