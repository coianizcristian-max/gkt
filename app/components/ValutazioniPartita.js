'use client'

import { vaiASchedaPartita } from '@/app/components/SchedePartitaMobile'
import { useState, useEffect } from 'react'
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

export default function ValutazioniPartita({ partitaId, golSubiti, golFatti = null, portieri, portieriAltri = [], valIniziali, scalaVoti = [], puntiOpts = [] }) {
  const t = useTranslations('valutazioniPartita')
  const router = useRouter()
  const cleanSheet = golSubiti === 0
  // Popup "che cosa sono i punti portati": si apre toccando la (i) accanto
  // all'etichetta, si chiude toccando ovunque.
  const [infoPunti, setInfoPunti] = useState(null)
  useEffect(() => {
    if (infoPunti == null) return
    const chiudi = (e) => { if (!e.target.closest?.('.vp-i')) setInfoPunti(null) }
    document.addEventListener('click', chiudi)
    return () => document.removeEventListener('click', chiudi)
  }, [infoPunti])

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

  // Controllo sui gol subiti: contano TUTTI i portieri che hanno giocato,
  // compresi quelli aggiunti da un'altra categoria (prima restavano fuori
  // dalla somma e l'avviso scattava anche con i numeri giusti).
  const tuttiIPortieri = [...rows, ...extra]
  const golInserito = (r) => r.presente && r.gol_subiti !== '' && r.gol_subiti != null
  const sommaGolPortieri = tuttiIPortieri.reduce((s, r) => s + (golInserito(r) ? Number(r.gol_subiti) : 0), 0)
  const qualcheGolInserito = tuttiIPortieri.some(golInserito)
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
                <label className="vp-lab-info">
                  {t('puntiPortati')}
                  <button type="button" className="vp-i" aria-label={t('puntiAiuto')}
                    onClick={() => setInfoPunti(infoPunti === r.portiere_id ? null : r.portiere_id)}>i</button>
                </label>
                {infoPunti === r.portiere_id && <span className="vp-bolla" role="tooltip">{t('puntiAiuto')}</span>}
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
              <textarea rows="6" value={r.note} onChange={(e) => onChange(i, { note: e.target.value })} />
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
      {golSubiti == null ? (
        // Risultato mancante: rimanda al dettaglio partita, dove si inserisce
        <div className="val-nessuno vp-riep vp-manca-ris">
          <span>{t('golSubitiMancanti')}</span>
          <button type="button" className="btn-mini" onClick={() => vaiASchedaPartita('dettaglio')}>{t('inserisciRisultato')}</button>
        </div>
      ) : (
        // Risultato sempre visibile, con il rimando per modificarlo nel dettaglio
        <div className="val-nessuno vp-riep vp-ris">
          <span>
            {golFatti != null && <b className="vp-ris-num">{golFatti}–{golSubiti}</b>}
            {cleanSheet ? t('cleanSheet') : t('golSubitiTot', { n: golSubiti })}
          </span>
          <button type="button" className="btn-mini" onClick={() => vaiASchedaPartita('dettaglio')}>{t('modificaRisultato')}</button>
        </div>
      )}

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
        <h3 className="vp-altri-tit">{t('altraCategoria')}</h3>
        {/* spiegazione lunga raccolta: si apre solo se serve */}
        <details className="vp-dett">
          <summary>{t('altraCategoriaQuando')}</summary>
          <p>{t('altraCategoriaIntro')}</p>
        </details>
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
