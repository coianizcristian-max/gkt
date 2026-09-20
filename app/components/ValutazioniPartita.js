'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

function makeRow(p, v, categoria = null) {
  return {
    portiere_id: p.id,
    nome: `${p.nome} ${p.cognome ?? ''}`.trim(),
    categoria,
    presente: v ? v.presente : (categoria ? true : false),
    voto: v?.voto ?? '',
    punti: v?.punti ?? '',
    gol_subiti: v?.gol_subiti ?? '',
    note: v?.note ?? '',
  }
}

export default function ValutazioniPartita({ partitaId, golSubiti, portieri, portieriAltri = [], valIniziali, scalaVoti = [], puntiOpts = [] }) {
  const t = useTranslations('valutazioniPartita')
  const router = useRouter()
  const cleanSheet = golSubiti === 0

  const [rows, setRows] = useState(() => portieri.map((p) => makeRow(p, valIniziali[p.id])))
  const [extra, setExtra] = useState(() =>
    portieriAltri.filter((p) => valIniziali[p.id]).map((p) => makeRow(p, valIniziali[p.id], p.categoria))
  )
  const [scelto, setScelto] = useState('')

  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const setRow = (i, patch) => { setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); setDone(false) }
  const setExtraRow = (i, patch) => { setExtra((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); setDone(false) }
  const num = (v) => (v === '' || v == null ? null : Number(v))

  const giaAggiunti = new Set(extra.map((r) => r.portiere_id))
  const disponibiliAltri = portieriAltri.filter((p) => !giaAggiunti.has(p.id))

  function aggiungiFuoriCat() {
    const p = portieriAltri.find((x) => x.id === scelto)
    if (!p) return
    setExtra((rs) => [...rs, makeRow(p, valIniziali[p.id], p.categoria)])
    setScelto(''); setDone(false)
  }
  function rimuoviFuoriCat(i) {
    setExtra((rs) => rs.filter((_, idx) => idx !== i)); setDone(false)
  }

  const sommaGolPortieri = rows.reduce((s, r) => s + (r.presente && r.gol_subiti !== '' && r.gol_subiti != null ? Number(r.gol_subiti) : 0), 0)
  const qualcheGolInserito = rows.some((r) => r.presente && r.gol_subiti !== '' && r.gol_subiti != null)
  const golNonCombaciano = golSubiti != null && qualcheGolInserito && sommaGolPortieri !== golSubiti

  async function salvaTutto() {
    setSaving(true); setError(''); setDone(false)
    const supabase = createClient()
    try {
      for (const r of rows) {
        const { error } = await supabase.from('valutazioni_partita').upsert({
          partita_id: partitaId, portiere_id: r.portiere_id,
          presente: r.presente, voto: num(r.voto), punti: num(r.punti), gol_subiti: num(r.gol_subiti), note: r.note || null,
          fuori_categoria: false,
        }, { onConflict: 'partita_id,portiere_id' })
        if (error) throw error
      }
      for (const r of extra) {
        const { error } = await supabase.from('valutazioni_partita').upsert({
          partita_id: partitaId, portiere_id: r.portiere_id,
          presente: r.presente, voto: num(r.voto), punti: num(r.punti), gol_subiti: num(r.gol_subiti), note: r.note || null,
          fuori_categoria: true,
        }, { onConflict: 'partita_id,portiere_id' })
        if (error) throw error
      }
      setDone(true); router.refresh()
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  // Scheda di un portiere. Non convocato: una riga sola (nome + interruttore),
  // niente campi spenti. Convocato: Voto, Punti e Gol subiti affiancati e
  // allineati, sotto le note.
  const renderCard = (r, i, opts) => {
    const { onChange, onRemove, fuori } = opts
    return (
      <div className={`val-card vp-card ${r.presente ? '' : 'assente'}`} key={r.portiere_id}>
        <div className="vp-head">
          <span className="vp-nome">
            {r.nome}
            {fuori && <span className="vp-fuori">{t('fuoriCategoria')}{r.categoria ? ` · ${r.categoria}` : ''}</span>}
          </span>
          <label className={`vp-conv ${r.presente ? 'on' : ''}`}>
            <input type="checkbox" checked={r.presente} onChange={(e) => onChange(i, { presente: e.target.checked })} />
            <span>{r.presente ? t('convocato') : t('nonConvocato')}</span>
          </label>
        </div>
        {r.presente && (
          <>
            <div className="vp-campi">
              <div className="vp-campo">
                <label>{t('voto')}</label>
                {scalaVoti.length > 0 ? (
                  <select value={r.voto} onChange={(e) => onChange(i, { voto: e.target.value })}>
                    <option value="">&mdash;</option>
                    {scalaVoti.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type="number" step="0.25" inputMode="decimal" value={r.voto} onChange={(e) => onChange(i, { voto: e.target.value })} />
                )}
              </div>
              <div className="vp-campo">
                <label>{t('punti')}</label>
                <select value={r.punti} onChange={(e) => onChange(i, { punti: e.target.value })}>
                  <option value="">&mdash;</option>
                  {puntiOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="vp-campo">
                <label>{t('golSubiti')}</label>
                <input type="number" min="0" inputMode="numeric" value={r.gol_subiti} onChange={(e) => onChange(i, { gol_subiti: e.target.value })} />
              </div>
            </div>
            <div className="vp-note">
              <label>{t('note')}</label>
              <textarea rows="2" value={r.note} onChange={(e) => onChange(i, { note: e.target.value })} />
            </div>
          </>
        )}
        {onRemove && (
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <button type="button" className="btn-mini btn-del" onClick={() => onRemove(i)}>{t('rimuovi')}</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="val-grid">
      {error && <div className="err">{error}</div>}
      <div className="val-nessuno">
        {cleanSheet ? t('cleanSheet') : golSubiti == null ? t('golSubitiMancanti') : t('golSubitiTot', { n: golSubiti })}
      </div>
      {golNonCombaciano && (
        <div className="val-nessuno" style={{ borderColor: 'var(--rosso)', color: 'var(--rosso)', fontWeight: 600 }}>
          {t('golNonCombaciano', { somma: sommaGolPortieri, tot: golSubiti })}
        </div>
      )}

      {rows.length === 0 && (
        <div className="val-nessuno">{t('nessunPortiereCat')}</div>
      )}
      {rows.map((r, i) => renderCard(r, i, { onChange: setRow }))}

      <div className="elenco-blocco" style={{ marginTop: 6 }}>
        <h3 style={{ marginBottom: 6 }}>{t('altraCategoria')}</h3>
        <p className="sub-intro" style={{ marginTop: 0 }}>{t('altraCategoriaIntro')}</p>
        {portieriAltri.length === 0 ? (
          <p className="sub-intro" style={{ margin: 0 }}>{t('nessunAltro')}</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <select value={scelto} onChange={(e) => setScelto(e.target.value)} style={{ minWidth: 220 }}>
              <option value="">{t('scegliPortiere')}</option>
              {disponibiliAltri.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''} — {p.categoria}</option>
              ))}
            </select>
            <button type="button" className="btn-ghost" onClick={aggiungiFuoriCat} disabled={!scelto}>{t('aggiungi')}</button>
          </div>
        )}
        {extra.map((r, i) => renderCard(r, i, { onChange: setExtraRow, onRemove: rimuoviFuoriCat, fuori: true }))}
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={salvaTutto} disabled={saving}>
          {saving ? t('salvataggio') : done ? t('salvato') : t('salva')}
        </button>
      </div>
    </div>
  )
}
