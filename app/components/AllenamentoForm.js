'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'
import DuplicaAllenamentoPicker from '@/app/components/DuplicaAllenamentoPicker'
import DuplicaTemplatePicker from '@/app/components/DuplicaTemplatePicker'
import { useTranslations } from 'next-intl'

export default function AllenamentoForm({ allenamento, categorie, stagioneId, defaultData }) {
  const router = useRouter()
  const t = useTranslations('allenamentoForm')
  const c = useTranslations('common')
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
      ? t('avvisoAccorpate', { nomi: nomiDipendenti.join(', '), count: nomiDipendenti.length })
      : ''
    if (!confirm(t('confermaElimina') + avviso)) return
    setDeleting(true)
    const { error } = await supabase.from('allenamenti').delete().eq('id', allenamento.id)
    if (error) { setError(error.message); setDeleting(false); return }
    router.push('/calendario'); router.refresh()
  }

  // Se l'allenamento è accorpato a un'altra categoria e' la stessa seduta:
  // orario, obiettivi e consuntivo si ereditano sempre dall'allenamento
  // accorpante nella stessa data e qui non si modificano.
  useEffect(() => {
    let annullato = false
    async function sincronizzaOrario() {
      if (!f.accorpata_con || !f.data) { setOrarioAccorpante(null); return }
      const supabase = createClient()
      const { data: acc } = await supabase.from('allenamenti')
        .select('ora_inizio, ora_fine, obiettivi, consuntivo')
        .eq('stagione_id', stagioneId).eq('squadra_id', f.accorpata_con).eq('data', f.data)
        .maybeSingle()
      if (annullato) return
      if (acc) {
        setOrarioAccorpante(acc)
        setF((s) => ({
          ...s,
          ora_inizio: acc.ora_inizio?.slice(0, 5) ?? s.ora_inizio,
          ora_fine: acc.ora_fine?.slice(0, 5) ?? '',
          obiettivi: acc.obiettivi ?? '',
          consuntivo: acc.consuntivo ?? '',
        }))
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
    if (!f.data) { setError(t('erroreData')); return }
    if (!f.squadra_id) { setError(t('erroreCategoria')); return }
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
        // propaga orario, obiettivi e consuntivo: è la stessa seduta, non ha senso
        // restino disallineati.
        await supabase.from('allenamenti')
          .update({ ora_inizio: payload.ora_inizio, ora_fine: payload.ora_fine, obiettivi: payload.obiettivi, consuntivo: payload.consuntivo })
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

  // campi presi dall'allenamento accorpante (non modificabili qui)
  const ereditato = !!f.accorpata_con && !!orarioAccorpante && orarioAccorpante !== 'assente'

  // Categorie "ospiti" = tutte tranne quella principale
  const altreCategorie = categorie.filter((c) => c.id !== f.squadra_id)

  return (
    <form className="scheda af-form" onSubmit={save}>
      {error && <div className="err">{error}</div>}
      <div className="form-grid">
        <div className="field"><label>{t('data')}</label>
          <input type="date" value={f.data} onChange={upd('data')} required /></div>
        <div className="field"><label>{t('categoria')}</label>
          <select value={f.squadra_id} onChange={upd('squadra_id')} disabled={isEdit} required>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></div>
        <div className="field"><label>{t('oraInizio')}</label>
          <input type="time" value={f.ora_inizio} onChange={upd('ora_inizio')} disabled={!!f.accorpata_con && orarioAccorpante && orarioAccorpante !== 'assente'} /></div>
        <div className="field"><label>{t('oraFine')}</label>
          <input type="time" value={f.ora_fine} onChange={upd('ora_fine')} disabled={!!f.accorpata_con && orarioAccorpante && orarioAccorpante !== 'assente'} /></div>
        <div className="field af-full">
          <label>{t('accorpataCon')}</label>
          <select value={f.accorpata_con} onChange={upd('accorpata_con')}>
            <option value="">{t('nessuna')}</option>
            {altreCategorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="field field-full"><label>{t('obiettivi')}</label>
          <textarea rows="3" value={f.obiettivi} onChange={upd('obiettivi')} disabled={ereditato} /></div>
        <div className="field field-full"><label>{t('consuntivo')}</label>
          <textarea rows="3" value={f.consuntivo} onChange={upd('consuntivo')} disabled={ereditato} /></div>
        <div className="field field-full"><label>{t('note')}</label>
          <textarea rows="2" value={f.note} onChange={upd('note')} /></div>
      </div>
      {f.accorpata_con && orarioAccorpante && orarioAccorpante !== 'assente' && (
        <p className="sub-intro" style={{ marginTop: 0 }}>
          {t('orarioAuto', { orario: `${orarioAccorpante.ora_inizio?.slice(0, 5)}${orarioAccorpante.ora_fine ? '–' + orarioAccorpante.ora_fine.slice(0, 5) : ''}` })}
        </p>
      )}
      {f.accorpata_con && orarioAccorpante === 'assente' && (
        <p className="sub-intro" style={{ marginTop: 0, color: 'var(--rosso)' }}>
          {t('orarioAssente')}
        </p>
      )}
      {f.accorpata_con && (
        <p className="sub-intro" style={{ marginTop: 0, color: 'var(--giallo)' }}>
          {t('avvisoAccorpato')}
        </p>
      )}
      {!isEdit && (
        <div style={{ marginTop: 14 }}>
          {!showDuplica && !eserciziDaDuplicare && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn-ghost" onClick={() => { setFonteDuplica('allenamento'); setShowDuplica(true) }}>
                {t('duplicaDaAllenamento')}
              </button>
              <button type="button" className="btn-ghost" onClick={() => { setFonteDuplica('template'); setShowDuplica(true) }}>
                {t('duplicaDaTemplate')}
              </button>
            </div>
          )}
          {!showDuplica && eserciziDaDuplicare && (
            <div className="sub-intro" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {t('eserciziPronti', { n: eserciziDaDuplicare.length })}
              <button type="button" className="btn-mini" onClick={() => setShowDuplica(true)}>{t('cambia')}</button>
              <button type="button" className="btn-mini" onClick={() => setEserciziDaDuplicare(null)}>{t('rimuovi')}</button>
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
      <div className="form-actions af-azioni" style={{ justifyContent: isEdit ? 'space-between' : 'flex-end' }}>
        {isEdit && (
          <button type="button" className="btn-ghost" onClick={elimina} disabled={deleting || saving} style={{ color: 'var(--rosso)', borderColor: 'var(--rosso)' }}>
            {deleting ? t('eliminazione') : t('eliminaAllenamento')}
          </button>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {!isEdit && <button type="button" className="btn-ghost" onClick={() => { if (window.history.length > 1) router.back(); else router.push('/calendario') }}>{c('annulla')}</button>}
          <button type="submit" className="btn" disabled={saving || deleting}>
            {saving ? t('salvataggio') : done ? t('salvato') : (isEdit ? t('salvaAllenamento') : t('creaValutazioni'))}
          </button>
        </div>
      </div>
    </form>
  )
}
