'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { trackEvento } from '@/app/components/PostHogProvider'
import { useTranslations } from 'next-intl'

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
  allenamentoId, allenamentoData = null, portieri, parametri, valIniziali, punteggiIniziali,
  scalaVoti = [], allenamentoNessuno = false,
}) {
  const router = useRouter()
  const inizioRef = useRef(null)
  const t = useTranslations('valutazioniAllenamento')
  const c = useTranslations('common')

  useEffect(() => {
    inizioRef.current = Date.now()
    trackEvento('valutazione_allenamento_avviata', { numero_portieri: portieri.length })
  }, [])
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
        // infortunio
        iscrizione_id: p.iscrizione_id ?? null,
        infortunato: !!p.infortunato,
        infortunioId: p.infortunioId ?? null,
        infortunioDal: p.infortunioDal ?? null,
        // assenza annunciata (solo informativa: non cambia presente/statistiche)
        assentePrevisto: !!p.assentePrevisto,
        assenzaNota: p.assenzaNota ?? null,
      }
    })
  )
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [nessuno, setNessuno] = useState(allenamentoNessuno)

  // ── Infortunio: form rapido dalla griglia ──
  const oggi = new Date().toISOString().slice(0, 10)
  const [infForm, setInfForm] = useState(null) // indice riga con form aperto
  const [infStart, setInfStart] = useState('')
  const [infRientro, setInfRientro] = useState('')
  const [infBusy, setInfBusy] = useState(false)
  const fmt = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT') : '')

  const setRow = (i, patch) => { setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); setDone(false) }
  const setPunt = (i, parId, val) => { setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, punteggi: { ...r.punteggi, [parId]: val } } : r))); setDone(false) }
  const num = (v) => (v === '' || v == null ? null : Number(v))

  function apriForm(i) { setInfForm(i); setInfStart(allenamentoData || oggi); setInfRientro('') }

  async function registraInfortunio(i) {
    const r = rows[i]
    if (!r.iscrizione_id) { setError(t('erroreIscrizione')); return }
    setInfBusy(true); setError('')
    try {
      const supabase = createClient()
      const { data, error: e } = await supabase.from('infortuni').insert({
        iscrizione_id: r.iscrizione_id,
        data_inizio: infStart || oggi,
        data_rientro_prevista: infRientro || null,
      }).select('id, data_inizio').single()
      if (e) throw e
      setRows((rs) => rs.map((x, idx) => (idx === i
        ? { ...x, infortunato: true, infortunioId: data.id, infortunioDal: data.data_inizio, presente: false }
        : x)))
      setInfForm(null)
      router.refresh()
    } catch (err) { setError(err.message || t('erroreSalvaInfortunio')) }
    setInfBusy(false)
  }

  async function terminaInfortunio(i) {
    const r = rows[i]
    if (!r.infortunioId) return
    setInfBusy(true); setError('')
    try {
      const supabase = createClient()
      const { error: e } = await supabase.from('infortuni').update({ data_fine: oggi }).eq('id', r.infortunioId)
      if (e) throw e
      setRows((rs) => rs.map((x, idx) => (idx === i
        ? { ...x, infortunato: false, infortunioId: null, infortunioDal: null }
        : x)))
      router.refresh()
    } catch (err) { setError(err.message || t('erroreChiusuraInfortunio')) }
    setInfBusy(false)
  }

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
          const presente = r.infortunato ? false : r.presente
          const { data: vrow, error: e1 } = await supabase.from('valutazioni').upsert({
            allenamento_id: allenamentoId, portiere_id: r.portiere_id,
            presente, voto: r.infortunato ? null : num(r.voto), note: r.note || null,
          }, { onConflict: 'allenamento_id,portiere_id' }).select('id').single()
          if (e1) throw e1

          if (!r.infortunato) {
            const punteggi = parametri
              .map((par) => ({ valutazione_id: vrow.id, parametro_id: par.id, punteggio: num(r.punteggi[par.id]) }))
              .filter((x) => x.punteggio != null)
            if (punteggi.length) {
              const { error: e2 } = await supabase.from('valutazione_punteggi')
                .upsert(punteggi, { onConflict: 'valutazione_id,parametro_id' })
              if (e2) throw e2
            }
          }
        }
      })

      setDone(true)
      const durataSec = inizioRef.current ? Math.round((Date.now() - inizioRef.current) / 1000) : null
      trackEvento('valutazione_allenamento_completata', { durata_secondi: durataSec, numero_portieri: rows.length, retry_necessari: retryCount })
      router.refresh()
      setTimeout(() => router.push('/calendario'), 900)
    } catch (err) {
      const msg = err?.message ?? t('erroreSconosciuto')
      const isNetErr = msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')
      setError(isNetErr
        ? t('erroreRete', { n: MAX_RETRY })
        : msg
      )
    }
    setSaving(false)
  }

  const savingLabel = retryCount > 0
    ? t('tentativo', { n: retryCount, tot: MAX_RETRY })
    : saving ? t('salvataggio') : done ? t('salvato') : t('salvaValutazioni')

  return (
    <div className="val-grid">
      {error && (
        <div className="err" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" className="btn-mini" onClick={salvaTutto} style={{ flexShrink: 0 }}>{t('riprova')}</button>
        </div>
      )}
      <label className="val-nessuno">
        <input type="checkbox" checked={nessuno} onChange={(e) => { setNessuno(e.target.checked); setDone(false) }} />
        {t('senzaValutazioni')}
      </label>
      {rows.map((r, i) => (
        <div className={`val-card ${r.infortunato ? 'infortunato' : (r.presente ? '' : 'assente')}`} key={r.portiere_id}>
          <div className="val-head">
            {r.infortunato ? (
              <span className="val-pres" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#c0392b' }}>
                {t('infortunato')}
              </span>
            ) : (
              <label className="val-pres">
                <input type="checkbox" checked={r.presente}
                  onChange={(e) => setRow(i, { presente: e.target.checked })} />
                {t('pres')}
              </label>
            )}
            <span className="val-nome">{r.nome}</span>
            {!r.infortunato && r.assentePrevisto && (
              <span title={r.assenzaNota || t('assenzaAnnunciata')}
                style={{ fontSize: 11, fontWeight: 700, color: '#9a6a00', background: '#fff8e6', border: '1px solid #f0d98a', borderRadius: 4, padding: '1px 6px', marginLeft: 6 }}>
                {t('assenzaAnnunciataBadge')}
              </span>
            )}
            {r.infortunato ? (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                {r.infortunioDal && <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t('dal')} {fmt(r.infortunioDal)}</span>}
                <button type="button" className="btn-mini" disabled={infBusy} onClick={() => terminaInfortunio(i)}>{t('termina')}</button>
              </div>
            ) : (
              <div className="val-voto">
                <span>{t('voto')}</span>
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
            )}
          </div>

          {/* azione rapida: segna infortunato (solo se non è già infortunato) */}
          {!r.infortunato && (
            <div style={{ marginTop: 6 }}>
              {infForm === i ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', background: '#fff4f4', border: '1px solid #f0caca', borderRadius: 8, padding: 8 }}>
                  <div className="field"><label>{t('inizioInfortunio')}</label>
                    <input type="date" value={infStart} onChange={(e) => setInfStart(e.target.value)} /></div>
                  <div className="field"><label>{t('rientroPrevisto')}</label>
                    <input type="date" value={infRientro} onChange={(e) => setInfRientro(e.target.value)} /></div>
                  <button type="button" className="btn-mini" disabled={infBusy} onClick={() => registraInfortunio(i)}>
                    {infBusy ? '…' : t('conferma')}
                  </button>
                  <button type="button" className="btn-ghost btn-mini" onClick={() => setInfForm(null)}>{c('annulla')}</button>
                </div>
              ) : (
                <button type="button" className="btn-mini btn-ghost" style={{ fontSize: 12 }} onClick={() => apriForm(i)}>
                  {t('segnaInfortunato')}
                </button>
              )}
            </div>
          )}

          {r.presente && !r.infortunato && (
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
                <label>{t('note')}</label>
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
