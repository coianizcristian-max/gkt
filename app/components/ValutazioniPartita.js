'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Costruisce una riga di valutazione a partire dal portiere e dagli eventuali dati salvati.
function makeRow(p, v, categoria = null) {
  return {
    portiere_id: p.id,
    nome: `${p.nome} ${p.cognome ?? ''}`.trim(),
    categoria, // valorizzata solo per i portieri fuori categoria
    presente: v ? v.presente : (categoria ? true : false),
    voto: v?.voto ?? '',
    punti: v?.punti ?? '',
    gol_subiti: v?.gol_subiti ?? '',
    note: v?.note ?? '',
  }
}

export default function ValutazioniPartita({ partitaId, golSubiti, portieri, portieriAltri = [], valIniziali, scalaVoti = [], puntiOpts = [] }) {
  const router = useRouter()
  const cleanSheet = golSubiti === 0

  // Righe della categoria (comportamento invariato)
  const [rows, setRows] = useState(() => portieri.map((p) => makeRow(p, valIniziali[p.id])))

  // Righe FUORI CATEGORIA: si parte da quelle già salvate (valIniziali marcati
  // fuori_categoria), poi se ne possono aggiungere altre dal menu a tendina.
  const [extra, setExtra] = useState(() =>
    portieriAltri
      .filter((p) => valIniziali[p.id])
      .map((p) => makeRow(p, valIniziali[p.id], p.categoria))
  )
  const [scelto, setScelto] = useState('')

  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const setRow = (i, patch) => { setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); setDone(false) }
  const setExtraRow = (i, patch) => { setExtra((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); setDone(false) }
  const num = (v) => (v === '' || v == null ? null : Number(v))

  // Portieri di altra categoria non ancora aggiunti alla lista fuori-categoria
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

  // Spia gol (solo portieri della categoria): la somma deve combaciare col totale squadra.
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
      // Righe fuori categoria: stesso upsert, marcate fuori_categoria = true.
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

  const renderCard = (r, i, opts) => {
    const { onChange, onRemove, fuori } = opts
    return (
      <div className={`val-card ${r.presente ? '' : 'assente'}`} key={r.portiere_id}>
        <div className="val-head">
          <label className="val-pres">
            <input type="checkbox" checked={r.presente} onChange={(e) => onChange(i, { presente: e.target.checked })} /> Convocato
          </label>
          <span className="val-nome">
            {r.nome}
            {fuori && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: 'var(--giallo)', background: 'rgba(232,167,44,0.14)', padding: '2px 8px', borderRadius: 999 }}>fuori categoria{r.categoria ? ` · ${r.categoria}` : ''}</span>}
          </span>
          <div className="val-voto">
            <span>Voto</span>
            {scalaVoti.length > 0 ? (
              <select value={r.voto} disabled={!r.presente} onChange={(e) => onChange(i, { voto: e.target.value })}>
                <option value="">&mdash;</option>
                {scalaVoti.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type="number" step="0.25" value={r.voto} disabled={!r.presente} onChange={(e) => onChange(i, { voto: e.target.value })} />
            )}
          </div>
        </div>
        {r.presente && (
          <>
            <div className="val-par">
              <label>Punti</label>
              <select value={r.punti} onChange={(e) => onChange(i, { punti: e.target.value })}>
                <option value="">&mdash;</option>
                {puntiOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="val-par">
              <label>Gol subiti</label>
              <input type="number" min="0" value={r.gol_subiti} onChange={(e) => onChange(i, { gol_subiti: e.target.value })} />
            </div>
            <div className="field"><label>Note</label>
              <textarea rows="2" value={r.note} onChange={(e) => onChange(i, { note: e.target.value })} /></div>
          </>
        )}
        {onRemove && (
          <div style={{ textAlign: 'right' }}>
            <button type="button" className="btn-mini btn-del" onClick={() => onRemove(i)}>Rimuovi</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="val-grid">
      {error && <div className="err">{error}</div>}
      <div className="val-nessuno">
        {cleanSheet ? 'Clean sheet: porta inviolata (0 gol subiti)' : `Gol subiti: ${golSubiti ?? '\u2014'}`}
      </div>
      {golNonCombaciano && (
        <div className="val-nessuno" style={{ borderColor: 'var(--rosso)', color: 'var(--rosso)', fontWeight: 600 }}>
          {'\u26A0'} La somma dei gol subiti dei portieri ({sommaGolPortieri}) non coincide con il totale squadra ({golSubiti}).
        </div>
      )}

      {rows.length === 0 && (
        <div className="val-nessuno">Nessun portiere di questa categoria: aggiungine uno di un&rsquo;altra categoria qui sotto per valutare comunque la partita.</div>
      )}
      {rows.map((r, i) => renderCard(r, i, { onChange: setRow }))}

      {/* ── Portiere di un'altra categoria (valutazione fuori categoria) ── */}
      <div className="elenco-blocco" style={{ marginTop: 6 }}>
        <h3 style={{ marginBottom: 6 }}>Portiere di un&rsquo;altra categoria</h3>
        <p className="sub-intro" style={{ marginTop: 0 }}>
          Se hanno giocato portieri non di questa categoria, aggiungili qui: la partita risulterà valutata e le loro prestazioni finiranno, nelle statistiche del portiere, sotto la voce separata &ldquo;Fuori categoria&rdquo; (non mescolate con quelle della sua categoria).
        </p>
        {portieriAltri.length === 0 ? (
          <p className="sub-intro" style={{ margin: 0 }}>Nessun altro portiere iscritto in altre categorie di questa stagione.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <select value={scelto} onChange={(e) => setScelto(e.target.value)} style={{ minWidth: 220 }}>
              <option value="">Scegli un portiere…</option>
              {disponibiliAltri.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''} — {p.categoria}</option>
              ))}
            </select>
            <button type="button" className="btn-ghost" onClick={aggiungiFuoriCat} disabled={!scelto}>+ Aggiungi</button>
          </div>
        )}
        {extra.map((r, i) => renderCard(r, i, { onChange: setExtraRow, onRemove: rimuoviFuoriCat, fuori: true }))}
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={salvaTutto} disabled={saving}>
          {saving ? 'Salvataggio...' : done ? 'Salvato \u2713' : 'Salva valutazioni'}
        </button>
      </div>
    </div>
  )
}
