'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AllenamentoForm({ allenamento, categorie, stagioneId, defaultData }) {
  const router = useRouter()
  const isEdit = !!allenamento
  const [f, setF] = useState({
    data: allenamento?.data ?? defaultData ?? '',
    squadra_id: allenamento?.squadra_id ?? (categorie[0]?.id ?? ''),
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
      data: f.data, squadra_id: f.squadra_id,
      obiettivi: f.obiettivi || null, consuntivo: f.consuntivo || null, note: f.note || null,
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
        router.push(`/calendario/${data.id}`); router.refresh()
      }
    } catch (err) { setError(err.message); setSaving(false) }
  }

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
        <div className="field field-full"><label>Obiettivi (cosa si dovrebbe fare)</label>
          <textarea rows="3" value={f.obiettivi} onChange={upd('obiettivi')} /></div>
        <div className="field field-full"><label>Consuntivo (cosa si è fatto)</label>
          <textarea rows="3" value={f.consuntivo} onChange={upd('consuntivo')} /></div>
        <div className="field field-full"><label>Note</label>
          <textarea rows="2" value={f.note} onChange={upd('note')} /></div>
      </div>
      <div className="form-actions">
        {!isEdit && <button type="button" className="btn-ghost" onClick={() => router.push('/calendario')}>Annulla</button>}
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Salvataggio…' : done ? 'Salvato ✓' : (isEdit ? 'Salva allenamento' : 'Crea e inserisci valutazioni')}
        </button>
      </div>
    </form>
  )
}
