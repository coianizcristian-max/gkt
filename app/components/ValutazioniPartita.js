'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ValutazioniPartita({ partitaId, golSubiti, portieri, valIniziali, scalaVoti = [], puntiOpts = [] }) {
  const router = useRouter()
  const cleanSheet = golSubiti === 0
  const [rows, setRows] = useState(() =>
    portieri.map((p) => {
      const v = valIniziali[p.id]
      return {
        portiere_id: p.id,
        nome: `${p.nome} ${p.cognome ?? ''}`.trim(),
        presente: v ? v.presente : false,
        voto: v?.voto ?? '',
        punti: v?.punti ?? '',
        gol_subiti: v?.gol_subiti ?? '',
        note: v?.note ?? '',
      }
    })
  )
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const setRow = (i, patch) => { setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); setDone(false) }
  const num = (v) => (v === '' || v == null ? null : Number(v))

  // Spia (non bloccante): la somma dei gol subiti dei portieri convocati deve
  // coincidere col totale squadra registrato sulla partita.
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
        }, { onConflict: 'partita_id,portiere_id' })
        if (error) throw error
      }
      setDone(true); router.refresh()
    } catch (err) { setError(err.message) }
    setSaving(false)
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
      {rows.map((r, i) => (
        <div className={`val-card ${r.presente ? '' : 'assente'}`} key={r.portiere_id}>
          <div className="val-head">
            <label className="val-pres">
              <input type="checkbox" checked={r.presente} onChange={(e) => setRow(i, { presente: e.target.checked })} /> Convocato
            </label>
            <span className="val-nome">{r.nome}</span>
            <div className="val-voto">
              <span>Voto</span>
              {scalaVoti.length > 0 ? (
                <select value={r.voto} disabled={!r.presente} onChange={(e) => setRow(i, { voto: e.target.value })}>
                  <option value="">&mdash;</option>
                  {scalaVoti.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type="number" step="0.25" value={r.voto} disabled={!r.presente} onChange={(e) => setRow(i, { voto: e.target.value })} />
              )}
            </div>
          </div>
          {r.presente && (
            <>
              <div className="val-par">
                <label>Punti</label>
                <select value={r.punti} onChange={(e) => setRow(i, { punti: e.target.value })}>
                  <option value="">&mdash;</option>
                  {puntiOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="val-par">
                <label>Gol subiti</label>
                <input type="number" min="0" value={r.gol_subiti} onChange={(e) => setRow(i, { gol_subiti: e.target.value })} />
              </div>
              <div className="field"><label>Note</label>
                <textarea rows="2" value={r.note} onChange={(e) => setRow(i, { note: e.target.value })} /></div>
            </>
          )}
        </div>
      ))}
      <div className="form-actions">
        <button type="button" className="btn" onClick={salvaTutto} disabled={saving}>
          {saving ? 'Salvataggio...' : done ? 'Salvato \u2713' : 'Salva valutazioni'}
        </button>
      </div>
    </div>
  )
}
