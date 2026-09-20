'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'
import { useTranslations } from 'next-intl'

// Autocomplete "avversario" custom: input di testo SEMPRE editabile (la tastiera
// non viene mai bloccata) + lista suggerimenti sotto al campo, filtrata mentre
// scrivi e selezionabile al tocco. Sostituisce <input list> + <datalist> nativo,
// che su iPad copriva il campo e impediva di digitare.
function AvversarioInput({ value, onChange, suggestions = [] }) {
  const t = useTranslations('partitaForm')
  const [open, setOpen] = useState(false)
  const q = (value || '').trim().toLowerCase()
  const matches = q
    ? suggestions.filter((s) => s && s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 8)
    : []

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        autoComplete="off"
        placeholder={t('phAvversario')}
      />
      {open && matches.length > 0 && (
        <ul
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30,
            margin: '4px 0 0', padding: 4, listStyle: 'none',
            background: 'var(--bianco, #fff)', border: '1px solid var(--bordo, #e2e2e2)',
            borderRadius: 'var(--r-sm, 8px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxHeight: 220, overflowY: 'auto',
          }}
        >
          {matches.map((m) => (
            <li key={m}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(m); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '8px 10px', border: 'none', background: 'transparent',
                  borderRadius: 6, fontSize: 15, color: 'var(--ink, #1a1a1a)',
                }}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function PartitaForm({ partita, categorie, stagioneId, avversari = [], defaultData }) {
  const router = useRouter()
  const isEdit = !!partita
  const inizioRef = useRef(null)
  const t = useTranslations('partitaForm')
  const c = useTranslations('common')

  useEffect(() => {
    if (!isEdit) {
      inizioRef.current = Date.now()
      trackEvento('partita_creazione_avviata')
    }
  }, [isEdit])

  const [f, setF] = useState({
    data: partita?.data ?? defaultData ?? '',
    squadra_id: partita?.squadra_id ?? (categorie[0]?.id ?? ''),
    avversario: partita?.avversario ?? '',
    casa: partita?.casa ?? true,
    ora_ritrovo: (partita?.ora_ritrovo ?? '').slice(0, 5),
    ora_inizio: (partita?.ora_inizio ?? '').slice(0, 5),
    gol_fatti: partita?.gol_fatti ?? '',
    gol_subiti: partita?.gol_subiti ?? '',
    note: partita?.note ?? '',
    tipo: partita?.tipo ?? 'campionato',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const upd = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setDone(false) }
  const num = (v) => (v === '' || v == null ? null : Number(v))

  async function elimina() {
    if (!confirm(t('confermaElimina'))) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('partite').delete().eq('id', partita.id)
    if (error) { setError(error.message); setDeleting(false); return }
    router.push('/partite'); router.refresh()
  }

  async function save(e) {
    e.preventDefault(); setError('')
    if (!f.data) { setError(t('erroreData')); return }
    if (!f.squadra_id) { setError(t('erroreCategoria')); return }
    setSaving(true)
    const supabase = createClient()
    const avv = f.avversario?.trim() || null
    const payload = {
      data: f.data, squadra_id: f.squadra_id, avversario: avv, casa: !!f.casa,
      ora_ritrovo: f.ora_ritrovo || null, ora_inizio: f.ora_inizio || null,
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
        const durataSec = inizioRef.current ? Math.round((Date.now() - inizioRef.current) / 1000) : null
        trackEvento('partita_creazione_completata', { durata_secondi: durataSec })
        router.push(`/partite/${data.id}`); router.refresh()
      }
    } catch (err) { setError(err.message); setSaving(false) }
  }

  return (
    <form className="scheda pf-form" onSubmit={save}>
      {error && <div className="err">{error}</div>}
      <div className="form-grid">
        <div className="field pf-data"><label>{t('data')}</label>
          <input type="date" value={f.data} onChange={upd('data')} required /></div>
        <div className="field pf-cat"><label>{t('categoria')}</label>
          <select value={f.squadra_id} onChange={upd('squadra_id')} disabled={isEdit} required>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></div>
        <div className="field pf-avv"><label>{t('avversario')}</label>
          <AvversarioInput
            value={f.avversario}
            onChange={(v) => { setF((s) => ({ ...s, avversario: v })); setDone(false) }}
            suggestions={avversari}
          /></div>
        <div className="field pf-dove"><label>{t('dove')}</label>
          <select value={f.casa ? '1' : '0'} onChange={(e) => { setF((s) => ({ ...s, casa: e.target.value === '1' })); setDone(false) }}>
            <option value="1">{c('casa')}</option>
            <option value="0">{c('trasferta')}</option>
          </select></div>
        <div className="field pf-rit"><label>{t('oraRitrovo')}</label>
          <input type="time" value={f.ora_ritrovo} onChange={upd('ora_ritrovo')} /></div>
        <div className="field pf-ini"><label>{t('oraInizio')}</label>
          <input type="time" value={f.ora_inizio} onChange={upd('ora_inizio')} /></div>
        <div className="field pf-comp"><label>{t('competizione')}</label>
          <select value={f.tipo} onChange={upd('tipo')}>
            <option value="campionato">{t('tipoCampionato')}</option>
            <option value="coppa">{t('tipoCoppa')}</option>
            <option value="torneo">{t('tipoTorneo')}</option>
            <option value="amichevole">{t('tipoAmichevole')}</option>
          </select></div>
        <div className="field pf-gf pf-ris"><label>{t('golFatti')}</label>
          <input type="number" min="0" inputMode="numeric" value={f.gol_fatti} onChange={upd('gol_fatti')} /></div>
        <div className="field pf-gs pf-ris"><label>{t('golSubiti')}</label>
          <input type="number" min="0" inputMode="numeric" value={f.gol_subiti} onChange={upd('gol_subiti')} /></div>
        <div className="field field-full pf-note"><label>{t('note')}</label>
          <textarea rows="2" value={f.note} onChange={upd('note')} /></div>
      </div>
      <div className="form-actions pf-azioni" style={{ justifyContent: isEdit ? 'space-between' : 'flex-end' }}>
        {isEdit && (
          <button type="button" className="btn-ghost" onClick={elimina} disabled={deleting || saving} style={{ color: 'var(--rosso)', borderColor: 'var(--rosso)' }}>
            {deleting ? t('eliminazione') : t('eliminaPartita')}
          </button>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {!isEdit && <button type="button" className="btn-ghost" onClick={() => { if (window.history.length > 1) router.back(); else router.push('/partite') }}>{c('annulla')}</button>}
          <button type="submit" className="btn" disabled={saving || deleting}>
            {saving ? t('salvataggio') : done ? t('salvato') : (isEdit ? t('salvaPartita') : t('creaValutazioni'))}
          </button>
        </div>
      </div>
    </form>
  )
}
