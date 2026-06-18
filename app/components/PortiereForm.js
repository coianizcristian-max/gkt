'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PortiereForm({ portiere, iscrizione, categorie, stagioneId, piedi = [], soloPortiere = false }) {
  const router = useRouter()
  const isEdit = !!portiere
  const [f, setF] = useState({
    nome: portiere?.nome ?? '',
    cognome: portiere?.cognome ?? '',
    data_nascita: portiere?.data_nascita ?? '',
    luogo_nascita: portiere?.luogo_nascita ?? '',
    indirizzo: portiere?.indirizzo ?? '',
    telefono: portiere?.telefono ?? '',
    contatto_genitore: portiere?.contatto_genitore ?? '',
    altezza_cm: portiere?.altezza_cm ?? '',
    peso_kg: portiere?.peso_kg ?? '',
    piede: portiere?.piede ?? '',
    squadra_provenienza: portiere?.squadra_provenienza ?? '',
    note: portiere?.note ?? '',
    squadra_id: iscrizione?.squadra_id ?? (categorie[0]?.id ?? ''),
    numero_maglia: iscrizione?.numero_maglia ?? '',
  })
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(portiere?.foto_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const tornaIndietro = () => router.push(soloPortiere && portiere ? `/portieri/${portiere.id}` : '/portieri')

  function onFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const num = (v) => (v === '' || v === null ? null : Number(v))

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!soloPortiere && !f.nome.trim()) { setError('Il nome è obbligatorio.'); return }
    if (!soloPortiere && !f.squadra_id) { setError('Seleziona una categoria.'); return }
    setSaving(true)
    const supabase = createClient()

    // Campi anagrafici modificabili. Per il portiere NON includiamo nome/cognome (bloccati).
    const anagrafica = {
      data_nascita: f.data_nascita || null,
      luogo_nascita: f.luogo_nascita || null,
      indirizzo: f.indirizzo || null,
      telefono: f.telefono || null,
      contatto_genitore: f.contatto_genitore || null,
      altezza_cm: num(f.altezza_cm),
      peso_kg: num(f.peso_kg),
      piede: f.piede || null,
      squadra_provenienza: f.squadra_provenienza || null,
      note: f.note || null,
    }
    if (!soloPortiere) {
      anagrafica.nome = f.nome.trim()
      anagrafica.cognome = f.cognome.trim() || null
    }

    try {
      let portiereId = portiere?.id
      if (isEdit) {
        const { error } = await supabase.from('portieri').update(anagrafica).eq('id', portiereId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('portieri').insert(anagrafica).select('id').single()
        if (error) throw error
        portiereId = data.id
      }

      // Foto
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop()
        const path = `${portiereId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('foto-portieri').upload(path, fotoFile, { upsert: true })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('foto-portieri').getPublicUrl(path)
        await supabase.from('portieri').update({ foto_url: pub.publicUrl }).eq('id', portiereId)
      }

      // Iscrizione (categoria + maglia): solo staff. Il portiere non puo' cambiarla.
      if (!soloPortiere) {
        const iscr = {
          portiere_id: portiereId,
          stagione_id: stagioneId,
          squadra_id: f.squadra_id,
          numero_maglia: num(f.numero_maglia),
        }
        const { error: iErr } = await supabase
          .from('iscrizioni')
          .upsert(iscr, { onConflict: 'portiere_id,stagione_id' })
        if (iErr) throw iErr
      }

      if (soloPortiere) { router.push(`/portieri/${portiereId}`); router.refresh() }
      else { router.push('/portieri'); router.refresh() }
    } catch (err) {
      setError(err.message || 'Errore durante il salvataggio.')
      setSaving(false)
    }
  }

  return (
    <form className="scheda" onSubmit={save}>
      {error && <div className="err">{error}</div>}
      {soloPortiere && <p className="sub-intro">Puoi aggiornare i tuoi dati (recapiti, misure, foto…). Nome, cognome e categoria sono gestiti dallo staff.</p>}

      <div className="scheda-foto">
        <div className="foto-box">
          {fotoPreview
            ? <img src={fotoPreview} alt="" />
            : <span className="foto-ph">Nessuna foto</span>}
        </div>
        <label className="foto-upload">
          {fotoPreview ? 'Cambia foto' : 'Carica foto'}
          <input type="file" accept="image/*" onChange={onFoto} hidden />
        </label>
      </div>

      <div className="form-grid">
        <div className="field"><label>Nome *</label>
          <input value={f.nome} onChange={upd('nome')} required disabled={soloPortiere} /></div>
        <div className="field"><label>Cognome</label>
          <input value={f.cognome} onChange={upd('cognome')} disabled={soloPortiere} /></div>

        <div className="field"><label>Categoria *</label>
          <select value={f.squadra_id} onChange={upd('squadra_id')} required disabled={soloPortiere}>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></div>
        <div className="field"><label>Numero di maglia</label>
          <input type="number" value={f.numero_maglia} onChange={upd('numero_maglia')} disabled={soloPortiere} /></div>

        <div className="field"><label>Data di nascita</label>
          <input type="date" value={f.data_nascita} onChange={upd('data_nascita')} /></div>
        <div className="field"><label>Luogo di nascita</label>
          <input value={f.luogo_nascita} onChange={upd('luogo_nascita')} /></div>

        <div className="field"><label>Altezza (cm)</label>
          <input type="number" value={f.altezza_cm} onChange={upd('altezza_cm')} /></div>
        <div className="field"><label>Peso (kg)</label>
          <input type="number" step="0.1" value={f.peso_kg} onChange={upd('peso_kg')} /></div>

        <div className="field"><label>Piede preferito</label>
          <select value={f.piede} onChange={upd('piede')}>
            <option value="">—</option>
            {piedi.map((p) => <option key={p} value={p}>{p}</option>)}
          </select></div>
        <div className="field"><label>Squadra di provenienza</label>
          <input value={f.squadra_provenienza} onChange={upd('squadra_provenienza')} /></div>

        <div className="field"><label>Indirizzo</label>
          <input value={f.indirizzo} onChange={upd('indirizzo')} /></div>
        <div className="field"><label>Telefono</label>
          <input value={f.telefono} onChange={upd('telefono')} /></div>

        <div className="field"><label>Contatto genitore</label>
          <input value={f.contatto_genitore} onChange={upd('contatto_genitore')} /></div>
        <div className="field field-full"><label>Note</label>
          <textarea rows="3" value={f.note} onChange={upd('note')} /></div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={tornaIndietro}>Annulla</button>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Salvataggio…' : (isEdit ? 'Salva modifiche' : 'Crea portiere')}
        </button>
      </div>
    </form>
  )
}