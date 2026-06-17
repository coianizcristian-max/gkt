'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PartitaForm({ partita, categorie, stagioneId, avversari = [], defaultData }) {
  const router = useRouter()
  const isEdit = !!partita
  const [f, setF] = useState({
    data: partita?.data ?? defaultData ?? '',
    squadra_id: partita?.squadra_id ?? (categorie[0]?.id ?? ''),
    avversario: partita?.avversario ?? '',
    casa: partita?.casa ?? true,
    gol_fatti: partita?.gol_fatti ?? '',
    gol_subiti: partita?.gol_subiti ?? '',
    note: partita?.note ?? '',
    tipo: partita?.tipo ?? 'campionato',
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }
  const num = (v) => (v === '' || v == null ? null : Number(v))

  async function save(e) {
    e.preventDefault(); setError('')
    if (!f.data) { setError('Inserisci la data.'); return }
    if (!f.squadra_id) { setError('Seleziona la categoria.'); return }
    setSaving(true)
    const supabase = createClient()
    const avv = f.avversario?.trim() || null
    const payload = {
      data: f.data, squadra_id: f.squadra_id, avversario: avv, casa: !!f.casa,
      gol_fatti: num(f.gol_fatti), gol_subiti: num(f.gol_subiti), note: f.note || null, tipo: f.tipo,
    }
    try {
      if (avv && !avversari.includes(avv)) {
        await supabase.from('squadre_avversarie').insert({ stagione_id: stagioneId, squadra_id: f.squadra_id, nome: avv })
      }
      if (isEdit) {
        const { error } = await supabase.from('partite').update(payload).eq('id', partita.id)
        if (error) throw error
        setDone(true); setSaving(false); router.refresh()
      } else {
        const { data, error } = await supabase.from('partite')
          .insert({ ...payload, stagione_id: stagioneId }).select('id').single()
        if (error) throw error
        router.push(`/partite/${data.id}`); router.refresh()
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
        <div className="field"><label>Avversario</label>
          <input list="avversari-list" value={f.avversario} onChange={upd('avversario')} />
          <datalist id="avversari-list">
            {avversari.map((a) => <option key={a} value={a} />)}
          </datalist></div>
        <div className="field"><label>Dove</label>
          <select value={f.casa ? '1' : '0'} onChange={(e) => { setF((s) => ({ ...s, casa: e.target.value === '1' })); setDone(false) }}>
            <option value="1">Casa</option>
            <option value="0">Trasferta</option>
          </select></div>
        <div className="field"><label>Competizione</label>
          <select value={f.tipo} onChange={upd('tipo')}>
            <option value="campionato">Campionato</option>
            <option value="coppa">Coppa</option>
            <option value="torneo">Torneo</option>
            <option value="amichevole">Amichevole</option>
          </select></div>
        <div className="field"><label>Gol fatti</label>
          <input type="number" min="0" value={f.gol_fatti} onChange={upd('gol_fatti')} /></div>
        <div className="field"><label>Gol subiti</label>
          <input type="number" min="0" value={f.gol_subiti} onChange={upd('gol_subiti')} /></div>
        <div className="field field-full"><label>Note</label>
          <textarea rows="2" value={f.note} onChange={upd('note')} /></div>
      </div>
      <div className="form-actions">
        {!isEdit && <button type="button" className="btn-ghost" onClick={() => router.push('/partite')}>Annulla</button>}
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Salvataggio...' : done ? 'Salvato \u2713' : (isEdit ? 'Salva partita' : 'Crea e inserisci valutazioni')}
        </button>
      </div>
    </form>
  )
}
