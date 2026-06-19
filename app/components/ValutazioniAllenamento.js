'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MAX_RETRY = 3
const RETRY_DELAY_MS = 1200

async function withRetry(fn, maxRetry = MAX_RETRY) {
  let lastErr
  for (let attempt = 0; attempt < maxRetry; attempt++) {
    try { return await fn() }
    catch (err) {
      lastErr = err
      if (attempt < maxRetry - 1) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
    }
  }
  throw lastErr
}

export default function ValutazioniAllenamento({
  allenamentoId, portieri, parametri, valIniziali, punteggiIniziali,
  scalaVoti = [], allenamentoNessuno = false,
}) {
  const router = useRouter()
  const [rows, setRows] = useState(() =>
    portieri.map((p) => {
      const v = valIniziali[p.id]
      const punt = {}
      const pp = v ? (punteggiIniziali[v.id] ?? {}) : {}
      for (const par of parametri) punt[par.id] = pp[par.id] ?? ''
      return {
        portiere_id: p.id,
        nome: `${p.nome} ${p.cognome ?? ''}`.trim(),
        presente: v ? v.presente : false,
        voto: v?.voto ?? '',
        note: v?.note ?? '',
        punteggi: punt,
      }
    })
  )
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [nessuno, setNessuno] = useState(allenamentoNessuno)

  const setRow = (i, patch) => { setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); setDone(false) }
  const setPunt = (i, parId, val) => { setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, punteggi: { ...r.punteggi, [parId]: val } } : r))); setDone(false) }
  const num = (v) => (v === '' || v == null ? null : Number(v))

  async function salvaTutto() {
    setSaving(true); setError(''); setDone(false); setRetryCount(0)
    const supabase = createClient()
    try {
      let attempt = 0
      await withRetry(async () => {
        attempt++
        if (attempt > 1) setRetryCount(attempt)
        const { error: eFlag } = await supabase.from('allenamenti')
          .update({ nessuna_valutazione: nessuno }).eq('id', allenamentoId)
        if (eFlag) throw eFlag

        for (const r of rows) {
          const { data: vrow, error: e1 } = await supabase.from('valutazioni').upsert({
            allenamento_id: allenamentoId, portiere_id: r.portiere_id,
            presente: r.presente, voto: num(r.voto), note: r.note || null,
          }, { onConflict: 'allenamento_id,portiere_id' }).select('id').single()
          if (e1) throw e1

          const punteggi = parametri
            .map((par) => ({ valutazione_id: vrow.id, parametro_id: par.id, punteggio: num(r.punteggi[par.id]) }))
            .filter((x) => x.punteggio != null)
          if (punteggi.length) {
            const { error: e2 } = await supabase.from('valutazione_punteggi')
              .upsert(punteggi, { onConflict: 'valutazione_id,parametro_id' })
            if (e2) throw e2
          }
        }
      })

      setDone(true)
      router.refresh()
      setTimeout(() => router.push('/calendario'), 900)
    } catch (err) {
      const msg = err?.message ?? 'Errore sconosciuto'
      const isNetErr = msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')
      setError(isNetErr
        ? `Errore di rete dopo ${MAX_RETRY} tentativi. Controlla la connessione e riprova.`
        : msg
      )
    }
    setSaving(false)
  }

  const savingLabel = retryCount > 0
    ? `Tentativo ${retryCount}/${MAX_RETRY}…`
    : saving ? 'Salvataggio…' : done ? 'Salvato ✓' : 'Salva valutazioni'

  return (
    <div className="val-grid">
      {error && (
        <div className="err" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" className="btn-mini" onClick={salvaTutto} style={{ flexShrink: 0 }}>
            Riprova
          </button>
        </div>
      )}
      <label className="val-nessuno">
        <input type="checkbox" checked={nessuno} onChange={(e) => { setNessuno(e.target.checked); setDone(false) }} />
        Allenamento svolto senza valutazioni individuali
      </label>
      {rows.map((r, i) => (
        <div className={`val-card ${r.presente ? '' : 'assente'}`} key={r.portiere_id}>
          <div className="val-head">
            <label className="val-pres">
              <input type="checkbox" checked={r.presente}
                onChange={(e) => setRow(i, { presente: e.target.checked })} />
              Pres.
            </label>
            <span className="val-nome">{r.nome}</span>
            <div className="val-voto">
              <span>Voto</span>
              {scalaVoti.length > 0 ? (
                <select value={r.voto} disabled={!r.presente}
                  onChange={(e) => setRow(i, { voto: e.target.value })} style={{ minWidth: 60 }}>
                  <option value="">—</option>
                  {scalaVoti.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type="number" step="0.25" min="1" max="10" value={r.voto}
                  disabled={!r.presente} onChange={(e) => setRow(i, { voto: e.target.value })} />
              )}
            </div>
          </div>
          {r.presente && (
            <>
              {parametri.length > 0 && (
                <div className="val-parametri">
                  {parametri.map((par) => (
                    <div className="val-par" key={par.id}>
                      <label>{par.nome}</label>
                      <input type="number" step="0.25" min="1" max="10"
                        value={r.punteggi[par.id]} onChange={(e) => setPunt(i, par.id, e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
              <div className="field">
                <label>Note</label>
                <textarea rows="2" value={r.note} onChange={(e) => setRow(i, { note: e.target.value })} />
              </div>
            </>
          )}
        </div>
      ))}
      <div className="form-actions">
        <button type="button" className="btn" onClick={salvaTutto} disabled={saving}>
          {savingLabel}
        </button>
      </div>
    </div>
  )
}
