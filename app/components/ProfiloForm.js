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
    via: profilo?.via ?? '',
    citta: profilo?.citta ?? '',
    cap: profilo?.cap ?? '',
    range_ricerca: profilo?.range_ricerca == null ? '' : String(profilo.range_ricerca),
    disponibile: profilo?.disponibile ?? true,
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
    setError('')
    // Campi obbligatori: senza indirizzo completo la geocodifica non parte
    // e l'allenatore non compare nella ricerca per zona.
    const mancanti = []
    if (!f.nome_completo?.trim()) mancanti.push('Nome completo')
    if (!f.via?.trim()) mancanti.push('Via')
    if (!f.citta?.trim()) mancanti.push('Città')
    if (!f.cap?.trim()) mancanti.push('CAP')
    if (mancanti.length) {
      setError(`Compila i campi obbligatori: ${mancanti.join(', ')}.`)
      return
    }
    setBusy(true)
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
      const payload = {
        nome_completo: f.nome_completo || null,
        telefono: f.telefono || null,
        bio: f.bio || null,
        via: f.via || null,
        citta: f.citta || null,
        cap: f.cap || null,
        range_ricerca: f.range_ricerca === '' ? null : Number(f.range_ricerca),
        disponibile: !!f.disponibile,
        esperienze: esperienze.filter((x) => x && x.trim()),
        certificati: certificati.filter((x) => x && x.trim()),
        foto_url,
      }
      // Geocodifica usando CAP + città per evitare omonimie (es. "Montecchio" è ambiguo,
      // "36030 Montecchio Precalcino" è univoco). Se manca il CAP, usa solo la città.
      // countrycodes=it limita la ricerca all'Italia.
      if (f.citta) {
        try {
          const query = f.cap ? `${f.cap} ${f.citta}, Italia` : `${f.citta}, Italia`
          const g = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=' + encodeURIComponent(query))
          const gj = await g.json()
          if (gj && gj[0]) { payload.lat = parseFloat(gj[0].lat); payload.lng = parseFloat(gj[0].lon) }
        } catch (e) {}
      }
      const { error } = await supabase.from('profili').update(payload).eq('id', userId)
      if (error) throw error
      setDone(true); setBusy(false); router.refresh()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <div className="scheda">
      {error && <div className="err">{error}</div>}
      <p className="sub-intro" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
        I campi con * sono obbligatori: l&apos;indirizzo serve a calcolare la tua posizione
        e a farti trovare dalle società della tua zona.
      </p>
      <div className="scheda-foto">
        <div className="foto-box">{preview ? <img src={preview} alt="" /> : <span className="foto-ph">Nessuna foto</span>}</div>
        <label className="foto-upload">{preview ? 'Cambia foto' : 'Carica foto'}<input type="file" accept="image/*" onChange={onFile} hidden /></label>
      </div>
      <div className="form-grid">
        <div className="field"><label>Nome completo *</label><input value={f.nome_completo} onChange={upd('nome_completo')} required /></div>
        <div className="field"><label>Telefono</label><input value={f.telefono} onChange={upd('telefono')} /></div>
        <div className="field"><label>Via *</label><input value={f.via} onChange={upd('via')} required /></div>
        <div className="field"><label>Citta *</label><input value={f.citta} onChange={upd('citta')} placeholder="usata per la ricerca" required /></div>
        <div className="field"><label>CAP *</label><input value={f.cap} onChange={upd('cap')} required /></div>
        <div className="field field-full">
          <div style={{ background: 'var(--carta)', border: '1px solid var(--linea)', borderRadius: 10, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, margin: 0 }}>
              <input type="checkbox" checked={f.disponibile} onChange={(e) => { setF((s) => ({ ...s, disponibile: e.target.checked })); setDone(false) }} />
              Disponibile per ricerca
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              Range di ricerca
              <select value={f.range_ricerca} onChange={upd('range_ricerca')}>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="20">20 km</option>
                <option value="30">30 km</option>
                <option value="50">50 km</option>
                <option value="70">70 km</option>
                <option value="100">100 km</option>
                <option value="200">200 km</option>
                <option value="">Nessun limite</option>
              </select>
            </label>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', flexBasis: '100%' }}>Se "Disponibile" e attivo, le societa entro il tuo range (calcolato dalla tua citta) possono trovarti.</span>
          </div>
        </div>
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
