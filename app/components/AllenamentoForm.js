'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'
import DuplicaAllenamentoPicker from '@/app/components/DuplicaAllenamentoPicker'
import DuplicaTemplatePicker from '@/app/components/DuplicaTemplatePicker'

export default function AllenamentoForm({ allenamento, categorie, stagioneId, defaultData }) {
  const router = useRouter()
  const isEdit = !!allenamento
  const inizioRef = useRef(null)
  const [showDuplica, setShowDuplica] = useState(false)
  const [fonteDuplica, setFonteDuplica] = useState('allenamento') // 'allenamento' | 'template'
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
    ora_inizio: allenamento?.ora_inizio?.slice(0, 5) ?? '18:00',
    ora_fine: allenamento?.ora_fine?.slice(0, 5) ?? '',
    accorpata_con: allenamento?.accorpata_con ?? '',
    obiettivi: allenamento?.obiettivi ?? '',
    consuntivo: allenamento?.consuntivo ?? '',
    note: allenamento?.note ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [orarioAccorpante, setOrarioAccorpante] = useState(null) // { ora_inizio, ora_fine } | null | 'assente'
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }

  async function elimina() {
    const supabase = createClient()
    // Se altre categorie sono accorpate a questo allenamento, avvisa: perderebbero
    // il riferimento agli esercizi (che sono gestiti solo qui).
    const { data: dipendenti } = await supabase.from('allenamenti')
      .select('id, squadre(nome)')
      .eq('stagione_id', stagioneId).eq('data', f.data).eq('accorpata_con', f.squadra_id)
    const nomiDipendenti = (dipendenti ?? []).map((d) => d.squadre?.nome).filter(Boolean)
    const avviso = nomiDipendenti.length > 0
      ? `\n\n⚠ Attenzione: ${nomiDipendenti.join(', ')} ${nomiDipendenti.length === 1 ? 'è accorpata' : 'sono accorpate'} a questo allenamento e ${nomiDipendenti.length === 1 ? 'perderebbe' : 'perderebbero'} l'accesso agli esercizi condivisi qui.`
      : ''
    if (!confirm(`Eliminare definitivamente questo allenamento? L'operazione non è reversibile.${avviso}`)) return
    setDeleting(true)
    const { error } = await supabase.from('allenamenti').delete().eq('id', allenamento.id)
    if (error) { setError(error.message); setDeleting(false); return }
    router.push('/calendario'); router.refresh()
  }

  // Se l'allenamento è accorpato a un'altra categoria, l'orario è inseparabile
  // da quello: lo eredita sempre dall'allenamento accorpante nella stessa data.
  useEffect(() => {
    let annullato = false
    async function sincronizzaOrario() {
      if (!f.accorpata_con || !f.data) { setOrarioAccorpante(null); return }
      const supabase = createClient()
      const { data: acc } = await supabase.from('allenamenti')
        .select('ora_inizio, ora_fine')
        .eq('stagione_id', stagioneId).eq('squadra_id', f.accorpata_con).eq('data', f.data)
        .maybeSingle()
      if (annullato) return
      if (acc) {
        setOrarioAccorpante(acc)
        setF((s) => ({ ...s, ora_inizio: acc.ora_inizio?.slice(0, 5) ?? s.ora_inizio, ora_fine: acc.ora_fine?.slice(0, 5) ?? '' }))
      } else {
        setOrarioAccorpante('assente')
      }
    }
    sincronizzaOrario()
    return () => { annullato = true }
  }, [f.accorpata_con, f.data, stagioneId])

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
      ora_inizio: f.ora_inizio || '18:00',
      ora_fine: f.ora_fine || null,
      accorpata_con: f.accorpata_con || null,
      obiettivi: f.obiettivi || null,
      consuntivo: f.consuntivo || null,
      note: f.note || null,
    }
    try {
      if (isEdit) {
        const { error } = await supabase.from('allenamenti').update(payload).eq('id', allenamento.id)
        if (error) throw error
        // Se questo allenamento è "accorpante" per altri (altre categorie accorpate a questo),
        // propaga il nuovo orario: è la stessa seduta, non ha senso restino disallineati.
        await supabase.from('allenamenti')
          .update({ ora_inizio: payload.ora_inizio, ora_fine: payload.ora_fine })
          .eq('stagione_id', stagioneId).eq('data', f.data).eq('accorpata_con', f.squadra_id)
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
        <div className="field"><label>Ora inizio</label>
          <input type="time" value={f.ora_inizio} onChange={upd('ora_inizio')} disabled={!!f.accorpata_con && orarioAccorpante && orarioAccorpante !== 'assente'} /></div>
        <div className="field"><label>Ora fine</label>
          <input type="time" value={f.ora_fine} onChange={upd('ora_fine')} disabled={!!f.accorpata_con && orarioAccorpante && orarioAccorpante !== 'assente'} /></div>
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
      {f.accorpata_con && orarioAccorpante && orarioAccorpante !== 'assente' && (
        <p className="sub-intro" style={{ marginTop: 0 }}>
          🕒 Orario preso automaticamente dall&apos;allenamento accorpante ({orarioAccorpante.ora_inizio?.slice(0, 5)}
          {orarioAccorpante.ora_fine ? `–${orarioAccorpante.ora_fine.slice(0, 5)}` : ''}): essendo la stessa seduta, l&apos;orario è sempre lo stesso.
        </p>
      )}
      {f.accorpata_con && orarioAccorpante === 'assente' && (
        <p className="sub-intro" style={{ marginTop: 0, color: 'var(--rosso)' }}>
          ⚠ Non trovo ancora un allenamento della categoria accorpante in questa data: imposta qui l&apos;orario provvisorio,
          si allineerà automaticamente non appena quell&apos;allenamento viene creato con la stessa data.
        </p>
      )}
      {f.accorpata_con && (
        <p className="sub-intro" style={{ marginTop: 0, color: 'var(--giallo)' }}>
          ⚠ Allenamento accorpato: nel calendario apparirà con cornice gialla. I portieri della categoria ospite vedranno la scheda di questa seduta.
        </p>
      )}
      {!isEdit && (
        <div style={{ marginTop: 14 }}>
          {!showDuplica && !eserciziDaDuplicare && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn-ghost" onClick={() => { setFonteDuplica('allenamento'); setShowDuplica(true) }}>
                📋 Duplica esercizi da un altro allenamento
              </button>
              <button type="button" className="btn-ghost" onClick={() => { setFonteDuplica('template'); setShowDuplica(true) }}>
                🗂 Duplica esercizi da un template
              </button>
            </div>
          )}
          {!showDuplica && eserciziDaDuplicare && (
            <div className="sub-intro" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              ✅ {eserciziDaDuplicare.length} esercizi pronti per essere copiati in questo allenamento.
              <button type="button" className="btn-mini" onClick={() => setShowDuplica(true)}>Cambia</button>
              <button type="button" className="btn-mini" onClick={() => setEserciziDaDuplicare(null)}>Rimuovi</button>
            </div>
          )}
          {showDuplica && fonteDuplica === 'allenamento' && (
            <DuplicaAllenamentoPicker
              onAnnulla={() => setShowDuplica(false)}
              onConferma={(idsOrdinati) => { setEserciziDaDuplicare(idsOrdinati); setShowDuplica(false) }}
            />
          )}
          {showDuplica && fonteDuplica === 'template' && (
            <DuplicaTemplatePicker
              onAnnulla={() => setShowDuplica(false)}
              onConferma={(idsOrdinati) => { setEserciziDaDuplicare(idsOrdinati); setShowDuplica(false) }}
            />
          )}
        </div>
      )}
      <div className="form-actions" style={{ justifyContent: isEdit ? 'space-between' : 'flex-end' }}>
        {isEdit && (
          <button type="button" className="btn-ghost" onClick={elimina} disabled={deleting || saving} style={{ color: 'var(--rosso)', borderColor: 'var(--rosso)' }}>
            {deleting ? 'Eliminazione...' : '🗑 Elimina allenamento'}
          </button>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {!isEdit && <button type="button" className="btn-ghost" onClick={() => router.push('/calendario')}>Annulla</button>}
          <button type="submit" className="btn" disabled={saving || deleting}>
            {saving ? 'Salvataggio…' : done ? 'Salvato ✓' : (isEdit ? 'Salva allenamento' : 'Crea e inserisci valutazioni')}
          </button>
        </div>
      </div>
    </form>
  )
}
