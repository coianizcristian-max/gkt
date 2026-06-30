'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'
import DuplicaAllenamentoPicker from '@/app/components/DuplicaAllenamentoPicker'

export default function AllenamentoForm({ allenamento, categorie, stagioneId, defaultData }) {
  const router = useRouter()
  const isEdit = !!allenamento
  const inizioRef = useRef(null)
  const [showDuplica, setShowDuplica] = useState(false)
  const [eserciziDaDuplicare, setEserciziDaDuplicare] = useState(null) // array ordinato di esercizio_id, o null

  useEffect(() => {
    if (!isEdit) {
      inizioRef.current = Date.now()
      trackEvento('allenamento_creazione_avviata')
    }
  }, [isEdit])

  const [f, setF] = useState({
    data: allenamento?.data ?? defaultData ?? '',
    squadra_id: allenamento?.squadra_id ?? (categorie[0]?.id ?? ''),
    accorpata_con: allenamento?.accorpata_con ?? '',
    obiettivi: allenamento?.obiettivi ?? '',
    consuntivo: allenamento?.consuntivo ?? '',
    note: allenamento?.note ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!f.data) { setError('Inserisci la data.'); return }
    if (!f.squadra_id) { setError('Seleziona la categoria.'); return }
    setSaving(true)
    const supabase = createClient()
    const payload = {
      data: f.data,
      squadra_id: f.squadra_id,
      accorpata_con: f.accorpata_con || null,
      obiettivi: f.obiettivi || null,
      consuntivo: f.consuntivo || null,
      note: f.note || null,
    }
    try {
      if (isEdit) {
        const { error } = await supabase.from('allenamenti').update(payload).eq('id', allenamento.id)
        if (error) throw error
        setDone(true); setSaving(false); router.refresh()
      } else {
        const { data, error } = await supabase.from('allenamenti')
          .insert({ ...payload, stagione_id: stagioneId }).select('id').single()
        if (error) throw error

        if (eserciziDaDuplicare?.length) {
          const rows = eserciziDaDuplicare.map((eid, i) => ({
            allenamento_id: data.id, esercizio_id: eid, ordine: i,
          }))
          const { error: dupErr } = await supabase.from('allenamento_esercizi').insert(rows)
          if (dupErr) console.error('Errore duplicazione esercizi:', dupErr.message)
        }

        const durataSec = inizioRef.current ? Math.round((Date.now() - inizioRef.current) / 1000) : null
        trackEvento('allenamento_creazione_completata', { durata_secondi: durataSec, esercizi_duplicati: !!eserciziDaDuplicare?.length })
        router.push(`/calendario/${data.id}`); router.refresh()
      }
    } catch (err) { setError(err.message); setSaving(false) }
  }

  // Categorie "ospiti" = tutte tranne quella principale
  const altreCategorie = categorie.filter((c) => c.id !== f.squadra_id)

  return (
    <form className="scheda" onSubmit={save}>
      {error && <div className="err">{error}</div>}
      <div className="form-grid">
        <div className="field"><label>Data *</label>
          <input type="date" value={f.data} onChange={upd('data')} required /></div>
        <div className="field"><label>Categoria *</label>
          <select value={f.squadra_id} onChange={upd('squadra_id')} disabled={isEdit} required>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></div>
        <div className="field">
          <label>Accorpata con (opzionale)</label>
          <select value={f.accorpata_con} onChange={upd('accorpata_con')}>
            <option value="">— Nessuna —</option>
            {altreCategorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="field field-full"><label>Obiettivi (cosa si dovrebbe fare)</label>
          <textarea rows="3" value={f.obiettivi} onChange={upd('obiettivi')} /></div>
        <div className="field field-full"><label>Consuntivo (cosa si è fatto)</label>
          <textarea rows="3" value={f.consuntivo} onChange={upd('consuntivo')} /></div>
        <div className="field field-full"><label>Note</label>
          <textarea rows="2" value={f.note} onChange={upd('note')} /></div>
      </div>
      {f.accorpata_con && (
        <p className="sub-intro" style={{ marginTop: 0, color: 'var(--giallo)' }}>
          ⚠ Allenamento accorpato: nel calendario apparirà con cornice gialla. I portieri della categoria ospite vedranno la scheda di questa seduta.
        </p>
      )}
      {!isEdit && (
        <div style={{ marginTop: 14 }}>
          {!showDuplica && !eserciziDaDuplicare && (
            <button type="button" className="btn-ghost" onClick={() => setShowDuplica(true)}>
              📋 Duplica esercizi da un altro allenamento
            </button>
          )}
          {!showDuplica && eserciziDaDuplicare && (
            <div className="sub-intro" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              ✅ {eserciziDaDuplicare.length} esercizi pronti per essere copiati in questo allenamento.
              <button type="button" className="btn-mini" onClick={() => setShowDuplica(true)}>Cambia</button>
              <button type="button" className="btn-mini" onClick={() => setEserciziDaDuplicare(null)}>Rimuovi</button>
            </div>
          )}
          {showDuplica && (
            <DuplicaAllenamentoPicker
              onAnnulla={() => setShowDuplica(false)}
              onConferma={(idsOrdinati) => { setEserciziDaDuplicare(idsOrdinati); setShowDuplica(false) }}
            />
          )}
        </div>
      )}
      <div className="form-actions">
        {!isEdit && <button type="button" className="btn-ghost" onClick={() => router.push('/calendario')}>Annulla</button>}
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Salvataggio…' : done ? 'Salvato ✓' : (isEdit ? 'Salva allenamento' : 'Crea e inserisci valutazioni')}
        </button>
      </div>
    </form>
  )
}
