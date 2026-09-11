'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const TIPI = ['campionato', 'coppa', 'torneo', 'amichevole']
const pad = (n) => String(n).padStart(2, '0')
const toDs = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function RicorrenzePartiteManager({ stagione, categorie, ricorrenzePartite }) {
  const t = useTranslations('ricorrenzePartite')
  const router = useRouter()
  const haRange = !!(stagione?.data_inizio && stagione?.data_fine)

  async function aggiungi(squadraId) {
    const supabase = createClient()
    const { error } = await supabase.from('ricorrenze_partite_stagionali').insert({
      stagione_id: stagione.id, squadra_id: squadraId,
      giorno_settimana: 7, tipo: 'campionato',
      data_inizio_ric: null, data_fine_ric: null,
    })
    if (error) alert(t('errore', { msg: error.message }))
    router.refresh()
  }

  const perCat = (id) => ricorrenzePartite.filter((r) => r.squadra_id === id)

  return (
    <div className="lista-editor">
      <div className="elenco-blocco" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>{t('metodo1')}</h3>
        <p className="sub-intro">{t('metodo1Intro')}</p>

        {!haRange && (
          <div className="err" style={{ marginBottom: 16 }}>
            {t.rich('senzaRange', { b: (ch) => <b>{ch}</b>, a: (ch) => <a href="/stagioni" className="link-inline">{ch}</a> })}
          </div>
        )}

        {categorie.map((c) => {
          const righe = perCat(c.id)
          return (
            <div key={c.id} style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 8px' }}>{c.nome}</h4>
              {righe.length === 0 && (
                <p className="sub-intro" style={{ color: 'var(--rosso)', margin: '0 0 8px' }}>{t('nessunaRicorrenza')}</p>
              )}
              {righe.map((r) => (
                <RicorrenzaPartitaRiga key={r.id} ricorrenza={r} stagione={stagione} onChanged={() => router.refresh()} />
              ))}
              <button className="btn-ghost" onClick={() => aggiungi(c.id)} type="button">{t('aggiungiGiorno')}</button>
            </div>
          )
        })}

        <GeneraPartite stagione={stagione} categorie={categorie} ricorrenzePartite={ricorrenzePartite} haRange={haRange} />
      </div>

      <ImportExcel stagione={stagione} categorie={categorie} />
    </div>
  )
}

function RicorrenzaPartitaRiga({ ricorrenza, stagione, onChanged }) {
  const t = useTranslations('ricorrenzePartite')
  const [g, setG] = useState(ricorrenza.giorno_settimana)
  const [tipo, setTipo] = useState(ricorrenza.tipo ?? 'campionato')
  const [dStart, setDStart] = useState(ricorrenza.data_inizio_ric ?? '')
  const [dEnd, setDEnd] = useState(ricorrenza.data_fine_ric ?? '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const ch = () => setDone(false)

  async function salva() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('ricorrenze_partite_stagionali').update({
      giorno_settimana: Number(g), tipo, data_inizio_ric: dStart || null, data_fine_ric: dEnd || null,
    }).eq('id', ricorrenza.id)
    if (error) alert(t('errore', { msg: error.message })); else setDone(true)
    setBusy(false); onChanged()
  }

  async function elimina() {
    if (!confirm(t('confermaElim'))) return
    const supabase = createClient()
    await supabase.from('ricorrenze_partite_stagionali').delete().eq('id', ricorrenza.id)
    onChanged()
  }

  return (
    <div className="lista-riga" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{t('giorno')}</span>
        <select value={g} onChange={(e) => { setG(e.target.value); ch() }}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{t('giorno_' + n)}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{t('competizione')}</span>
        <select value={tipo} onChange={(e) => { setTipo(e.target.value); ch() }}>
          {TIPI.map((k) => <option key={k} value={k}>{t('tipo_' + k)}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{t('dal')}</span>
        <input type="date" value={dStart} min={stagione?.data_inizio ?? ''} max={stagione?.data_fine ?? ''}
          onChange={(e) => { setDStart(e.target.value); ch() }} style={{ width: 130 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{t('al')}</span>
        <input type="date" value={dEnd} min={stagione?.data_inizio ?? ''} max={stagione?.data_fine ?? ''}
          onChange={(e) => { setDEnd(e.target.value); ch() }} style={{ width: 130 }} />
      </div>
      <div style={{ display: 'flex', gap: 4, alignSelf: 'flex-end' }}>
        <button className="btn-mini" onClick={salva} disabled={busy} type="button">{done ? '✓' : t('salva')}</button>
        <button className="btn-mini btn-del" onClick={elimina} type="button">{t('elimina')}</button>
      </div>
    </div>
  )
}

function GeneraPartite({ stagione, categorie, ricorrenzePartite, haRange }) {
  const t = useTranslations('ricorrenzePartite')
  const router = useRouter()
  const [gen, setGen] = useState('')

  async function genera() {
    if (!haRange) { alert(t('impostaRange')); return }
    if (!ricorrenzePartite.length) { alert(t('aggiungiAlmeno')); return }
    if (!confirm(t('confermaGenera'))) return
    setGen('working')
    const supabase = createClient()
    try {
      const stagStart = new Date(stagione.data_inizio + 'T00:00:00')
      const stagEnd = new Date(stagione.data_fine + 'T00:00:00')
      const { data: existing } = await supabase.from('partite').select('id, data, squadra_id').eq('stagione_id', stagione.id)
      const existSet = new Set((existing ?? []).map((p) => p.squadra_id + '|' + p.data))
      const toInsert = []
      const seen = new Set()
      for (const r of ricorrenzePartite) {
        const dow = r.giorno_settimana % 7
        const rStart = r.data_inizio_ric ? new Date(r.data_inizio_ric + 'T00:00:00') : new Date(stagStart)
        const rEnd = r.data_fine_ric ? new Date(r.data_fine_ric + 'T00:00:00') : new Date(stagEnd)
        const start = rStart < stagStart ? new Date(stagStart) : rStart
        const end = rEnd > stagEnd ? new Date(stagEnd) : rEnd
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getDay() === dow) {
            const ds = toDs(d)
            const key = r.squadra_id + '|' + ds
            if (!existSet.has(key) && !seen.has(key)) {
              seen.add(key)
              toInsert.push({ stagione_id: stagione.id, squadra_id: r.squadra_id, data: ds, avversario: null, casa: null, tipo: r.tipo || 'campionato' })
            }
          }
        }
      }
      let inseriti = 0
      for (let i = 0; i < toInsert.length; i += 200) {
        const { error } = await supabase.from('partite').insert(toInsert.slice(i, i + 200))
        if (error) throw error
        inseriti += Math.min(200, toInsert.length - i)
      }
      setGen(inseriti > 0 ? t('createN', { n: inseriti }) : t('nessunaNuova'))
      router.refresh()
    } catch (err) { setGen(t('errore', { msg: err.message })) }
  }

  return (
    <div className="form-actions" style={{ marginTop: 12 }}>
      <button className="btn" onClick={genera} disabled={gen === 'working' || !haRange} type="button">
        {gen === 'working' ? t('generazione') : t('generaPartite')}
      </button>
      {gen && gen !== 'working' && <p className="sub-intro" style={{ marginTop: 8 }}>{gen}</p>}
    </div>
  )
}

function parseDataCella(v) {
  if (v == null || v === '') return null
  if (v instanceof Date) return toDs(v)
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${pad(m[1])}-${pad(m[2])}`
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  return null
}

function parseOra(v) {
  if (v == null || v === '') return null
  if (v instanceof Date) return `${pad(v.getHours())}:${pad(v.getMinutes())}`
  if (typeof v === 'number') {
    let mins = Math.round(v * 24 * 60)
    mins = ((mins % 1440) + 1440) % 1440
    return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
  }
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2})[:.](\d{2})/)
  if (m) return `${pad(Number(m[1]))}:${m[2]}`
  return null
}

function parseCasaTrasferta(v) {
  const s = String(v ?? '').trim().toLowerCase()
  if (s === 'casa') return true
  if (s === 'trasferta') return false
  return null
}

function ImportExcel({ stagione, categorie }) {
  const t = useTranslations('ricorrenzePartite')
  const router = useRouter()
  const fileRef = useRef(null)
  const [squadraId, setSquadraId] = useState(categorie[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [risultato, setRisultato] = useState(null)
  const [errore, setErrore] = useState('')

  async function importa() {
    setErrore(''); setRisultato(null)
    const file = fileRef.current?.files?.[0]
    if (!file) { setErrore(t('selezionaFile')); return }
    if (!squadraId) { setErrore(t('selezionaCategoria')); return }
    setBusy(true)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

      const supabase = createClient()
      const { data: existing } = await supabase.from('partite').select('id, data').eq('stagione_id', stagione.id).eq('squadra_id', squadraId)
      const existById = new Map()
      for (const p of existing ?? []) if (!existById.has(p.data)) existById.set(p.data, p.id)

      const targetByData = new Map()
      const righeSaltate = []
      rows.forEach((row, idx) => {
        const dataAndata = parseDataCella(row['Data andata'])
        const dataRitorno = parseDataCella(row['Data ritorno'])
        const casaAndata = parseCasaTrasferta(row['Casa o trasferta (andata)'])
        const avversario = row['Squadra avversaria'] ? String(row['Squadra avversaria']).trim() : null
        const oraRitrovoA = parseOra(row['Ora ritrovo andata'] ?? row['Ora ritrovo'])
        const oraInizioA = parseOra(row['Ora inizio andata'] ?? row['Ora inizio'])
        const oraRitrovoR = parseOra(row['Ora ritrovo ritorno'] ?? row['Ora ritrovo'])
        const oraInizioR = parseOra(row['Ora inizio ritorno'] ?? row['Ora inizio'])

        if (!dataAndata && !dataRitorno) return
        if (!dataAndata || casaAndata === null || !avversario) { righeSaltate.push(idx + 2); return }
        targetByData.set(dataAndata, { data: dataAndata, avversario, casa: casaAndata, tipo: 'campionato', ora_ritrovo: oraRitrovoA, ora_inizio: oraInizioA })
        if (dataRitorno) {
          targetByData.set(dataRitorno, { data: dataRitorno, avversario, casa: !casaAndata, tipo: 'campionato', ora_ritrovo: oraRitrovoR, ora_inizio: oraInizioR })
        }
      })

      const toInsert = []
      const toUpdate = []
      for (const tg of targetByData.values()) {
        const existingId = existById.get(tg.data)
        const campi = { avversario: tg.avversario, casa: tg.casa, tipo: tg.tipo, ora_ritrovo: tg.ora_ritrovo, ora_inizio: tg.ora_inizio }
        if (existingId) toUpdate.push({ id: existingId, patch: campi })
        else toInsert.push({ stagione_id: stagione.id, squadra_id: squadraId, data: tg.data, ...campi })
      }

      let inseriti = 0
      for (let i = 0; i < toInsert.length; i += 200) {
        const { error } = await supabase.from('partite').insert(toInsert.slice(i, i + 200))
        if (error) throw error
        inseriti += Math.min(200, toInsert.length - i)
      }
      let aggiornate = 0
      for (const u of toUpdate) {
        const { error } = await supabase.from('partite').update(u.patch).eq('id', u.id)
        if (error) throw error
        aggiornate += 1
      }

      setRisultato({ inseriti, aggiornate, saltate: righeSaltate })
      router.refresh()
    } catch (err) { setErrore(t('errore', { msg: err.message })) }
    setBusy(false)
  }

  return (
    <div className="elenco-blocco">
      <h3 style={{ marginTop: 0 }}>{t('metodo2')}</h3>
      <p className="sub-intro">{t.rich('metodo2Intro', { b: (ch) => <b>{ch}</b> })}</p>
      <div style={{ marginBottom: 16 }}>
        <a href="/templates/calendario-partite-template.xlsx" download className="btn-ghost">{t('scaricaTemplate')}</a>
      </div>
      {errore && <div className="err" style={{ marginBottom: 12 }}>{errore}</div>}
      {risultato && (
        <div className="ok-msg" style={{ marginBottom: 12 }}>
          {t('importOk', { nuove: risultato.inseriti, aggiornate: risultato.aggiornate })}
          {risultato.saltate.length > 0 && (
            <> {t('righeSaltate', { righe: risultato.saltate.join(', ') })}</>
          )}
        </div>
      )}
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>{t('categoria')}</label>
          <select value={squadraId} onChange={(e) => setSquadraId(e.target.value)}>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>{t('fileCompilato')}</label>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" />
        </div>
      </div>
      <button className="btn" onClick={importa} disabled={busy} type="button">{busy ? t('importazione') : t('importaCalendario')}</button>
    </div>
  )
}
