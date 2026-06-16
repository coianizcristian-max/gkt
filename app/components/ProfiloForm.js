'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ProfiloForm({ profilo, userId }) {
  const router = useRouter()
  const [f, setF] = useState({
    nome_completo: profilo?.nome_completo ?? '',
    telefono: profilo?.telefono ?? '',
    bio: profilo?.bio ?? '',
  })
  const [esperienze, setEsperienze] = useState(Array.isArray(profilo?.esperienze) ? profilo.esperienze : [])
  const [certificati, setCertificati] = useState(Array.isArray(profilo?.certificati) ? profilo.certificati : [])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(profilo?.foto_url ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }
  function onFile(e) { const fl = e.target.files?.[0]; if (!fl) return; setFile(fl); setPreview(URL.createObjectURL(fl)); setDone(false) }

  const mkSet = (arr, setArr) => (i, v) => { setArr(arr.map((x, idx) => (idx === i ? v : x))); setDone(false) }
  const mkAdd = (arr, setArr) => () => { setArr([...arr, '']); setDone(false) }
  const mkDel = (arr, setArr) => (i) => { setArr(arr.filter((_, idx) => idx !== i)); setDone(false) }

  async function salva() {
    setBusy(true); setError('')
    const supabase = createClient()
    try {
      let foto_url = profilo?.foto_url ?? null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `profili/${userId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('sito').upload(path, file, { upsert: true })
        if (upErr) throw upErr
        foto_url = supabase.storage.from('sito').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('profili').update({
        nome_completo: f.nome_completo || null,
        telefono: f.telefono || null,
        bio: f.bio || null,
        esperienze: esperienze.filter((x) => x && x.trim()),
        certificati: certificati.filter((x) => x && x.trim()),
        foto_url,
      }).eq('id', userId)
      if (error) throw error
      setDone(true); setBusy(false); router.refresh()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <div className="scheda">
      {error && <div className="err">{error}</div>}
      <div className="scheda-foto">
        <div className="foto-box">{preview ? <img src={preview} alt="" /> : <span className="foto-ph">Nessuna foto</span>}</div>
        <label className="foto-upload">{preview ? 'Cambia foto' : 'Carica foto'}<input type="file" accept="image/*" onChange={onFile} hidden /></label>
      </div>
      <div className="form-grid">
        <div className="field"><label>Nome completo</label><input value={f.nome_completo} onChange={upd('nome_completo')} /></div>
        <div className="field"><label>Telefono</label><input value={f.telefono} onChange={upd('telefono')} /></div>
        <div className="field field-full"><label>Bio</label><textarea rows="3" value={f.bio} onChange={upd('bio')} /></div>
      </div>
      <ListaEditabile titolo="Esperienze" items={esperienze}
        onSet={mkSet(esperienze, setEsperienze)} onAdd={mkAdd(esperienze, setEsperienze)} onDel={mkDel(esperienze, setEsperienze)}
        ph="Es. Preparatore portieri Under 17, 2023-24" />
      <ListaEditabile titolo="Certificati" items={certificati}
        onSet={mkSet(certificati, setCertificati)} onAdd={mkAdd(certificati, setCertificati)} onDel={mkDel(certificati, setCertificati)}
        ph="Es. Corso UEFA C / Patentino preparatore portieri" />
      <div className="form-actions">
        <button className="btn" onClick={salva} disabled={busy} type="button">{busy ? 'Salvataggio...' : done ? 'Salvato \u2713' : 'Salva profilo'}</button>
      </div>
    </div>
  )
}

function ListaEditabile({ titolo, items, onSet, onAdd, onDel, ph }) {
  return (
    <div className="elenco-blocco">
      <h3>{titolo}</h3>
      {items.length === 0 && <p className="sub-intro">Nessuna voce.</p>}
      {items.map((v, i) => (
        <div className="lista-riga" key={i}>
          <input className="lista-nome" style={{ flex: 1 }} value={v} placeholder={ph} onChange={(e) => onSet(i, e.target.value)} />
          <button className="btn-mini btn-del" onClick={() => onDel(i)} type="button">Rimuovi</button>
        </div>
      ))}
      <button className="btn-ghost" onClick={onAdd} type="button">+ Aggiungi</button>
    </div>
  )
}
