'use client'

import { useState, useEffect, useMemo } from 'react'
import { caricaParametri } from '@/lib/parametri'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

const COLORI = ['#0a7ec2', '#2fae66', '#e0a400', '#d6493b', '#7a5bd6', '#12a4a4', '#e0663b', '#4a5b68', '#c23fa0', '#5b8c00']

export default function ConfrontoPortieri({ stagioneId, titolo, mioId = null, anonimo = false }) {
  const t = useTranslations('confrontoPortieri')
  const locale = useLocale()
  const titoloEff = titolo ?? t('titoloDefault')
  const [rows, setRows] = useState(null)
  const [med, setMed] = useState(null)
  const [parametri, setParametri] = useState([])
  const [cat, setCat] = useState('all')
  const [metrica, setMetrica] = useState('presenze')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.rpc('presenze_confronto', { p_stagione: stagioneId })
      if (vivo) setRows(data ?? [])
    })()
    return () => { vivo = false }
  }, [stagioneId])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const supabase = createClient()
      const [{ data: allen }, { data: par }] = await Promise.all([
        supabase.from('allenamenti').select('id, squadra_id').eq('stagione_id', stagioneId),
        caricaParametri(supabase, locale),
      ])
      const allenById = new Map((allen ?? []).map((a) => [a.id, a.squadra_id]))
      const allenIds = [...allenById.keys()]
      if (!allenIds.length) {
        if (vivo) { setParametri(par ?? []); setMed({ vals: [], allenById, punteggi: [], valById: new Map() }) }
        return
      }
      const { data: vals } = await supabase.from('valutazioni')
        .select('id, portiere_id, voto, presente, allenamento_id')
        .in('allenamento_id', allenIds)
      const valById = new Map((vals ?? []).map((v) => [v.id, v]))
      const valIds = (vals ?? []).map((v) => v.id)
      let punteggi = []
      for (let i = 0; i < valIds.length; i += 500) {
        const { data: pp } = await supabase.from('valutazione_punteggi')
          .select('valutazione_id, parametro_id, punteggio').in('valutazione_id', valIds.slice(i, i + 500))
        punteggi = punteggi.concat(pp ?? [])
      }
      if (vivo) { setParametri(par ?? []); setMed({ vals: vals ?? [], allenById, punteggi, valById }) }
    })()
    return () => { vivo = false }
  }, [stagioneId])

  const nomeById = useMemo(() => {
    const m = {}
    for (const r of rows ?? []) m[r.portiere_id] = `${r.nome ?? ''} ${(r.cognome ?? '').slice(0, 1)}.`.trim()
    return m
  }, [rows])

  const categorie = useMemo(() => {
    const catMap = {}
    for (const r of rows ?? []) if (r.squadra_id) catMap[r.squadra_id] = r.squadra_nome ?? t('categoriaFallback')
    return Object.entries(catMap).map(([id, nome]) => ({ id, nome }))
  }, [rows, t])

  const metriche = useMemo(() => ([
    { key: 'presenze', label: t('metPresenze') },
    { key: 'voto', label: t('metVoto') },
    ...parametri.map((p) => ({ key: 'p:' + p.id, label: p.nome })),
  ]), [parametri, t])

  const medie = useMemo(() => {
    if (!med || metrica === 'presenze') return null
    const acc = {}
    const add = (pid, squadra, val) => {
      if (val == null || isNaN(val)) return
      if (cat !== 'all' && squadra !== cat) return
      const a = (acc[pid] ??= { sum: 0, n: 0 })
      a.sum += Number(val); a.n += 1
    }
    if (metrica === 'voto') {
      for (const v of med.vals) {
        if (!v.presente || v.voto == null) continue
        add(v.portiere_id, med.allenById.get(v.allenamento_id), v.voto)
      }
    } else if (metrica.startsWith('p:')) {
      const parId = metrica.slice(2)
      for (const pnt of med.punteggi) {
        if (String(pnt.parametro_id) !== parId || pnt.punteggio == null) continue
        const v = med.valById.get(pnt.valutazione_id)
        if (!v) continue
        add(v.portiere_id, med.allenById.get(v.allenamento_id), pnt.punteggio)
      }
    }
    const out = {}
    for (const [pid, { sum, n }] of Object.entries(acc)) if (n > 0) out[pid] = Math.round((sum / n) * 10) / 10
    return out
  }, [med, metrica, cat])

  if (rows === null) return <Guscio titolo={titoloEff}><div className="empty" style={{ padding: '10px 0' }}>{t('carico')}</div></Guscio>
  if (rows.length === 0) return <Guscio titolo={titoloEff}><div className="empty" style={{ padding: '10px 0' }}>{t('nessunDato')}</div></Guscio>

  const filtrate = cat === 'all' ? rows : rows.filter((r) => r.squadra_id === cat)
  const portMap = {}
  for (const r of filtrate) portMap[r.portiere_id] = nomeById[r.portiere_id] ?? `${r.nome ?? ''}`.trim()
  const portieriPres = Object.keys(portMap)
  const colore = {}
  portieriPres.forEach((id, i) => { colore[id] = COLORI[i % COLORI.length] })

  const mesiSet = new Set()
  for (const r of filtrate) if (r.mese) mesiSet.add(r.mese)
  const mesi = [...mesiSet].sort()
  const perMese = {}, totale = {}
  for (const id of portieriPres) { totale[id] = 0; perMese[id] = {} }
  for (const r of filtrate) {
    const n = Number(r.presenze) || 0
    totale[r.portiere_id] = (totale[r.portiere_id] || 0) + n
    if (r.mese) perMese[r.portiere_id][r.mese] = (perMese[r.portiere_id][r.mese] || 0) + n
  }

  const portieriMedie = medie ? Object.keys(medie) : []
  const coloreMedie = {}
  portieriMedie.forEach((id, i) => { coloreMedie[id] = COLORI[i % COLORI.length] })
  const metricaLabel = metriche.find((m) => m.key === metrica)?.label ?? ''

  // Vista portiere (anonimo): aggrega gli altri in un'unica "Media categoria",
  // senza mostrare i nomi dei compagni. Riusa gli stessi grafici a barre.
  const GRIGIO = '#9aa6b0'
  let presView = { ids: portieriPres, portMap, colore, totale, perMese }
  let medieView = {
    ids: portieriMedie,
    portMap: Object.fromEntries(portieriMedie.map((id) => [id, nomeById[id] ?? id])),
    colore: coloreMedie, valori: medie ?? {},
  }
  if (anonimo && mioId) {
    const altri = portieriPres.filter((x) => x !== mioId)
    const meT = totale[mioId] ?? 0
    const medT = altri.length ? Math.round((altri.reduce((s, x) => s + (totale[x] ?? 0), 0) / altri.length) * 10) / 10 : 0
    const meMese = {}, medMese = {}
    for (const m of mesi) {
      meMese[m] = perMese[mioId]?.[m] ?? 0
      medMese[m] = altri.length ? Math.round((altri.reduce((s, x) => s + (perMese[x]?.[m] ?? 0), 0) / altri.length) * 10) / 10 : 0
    }
    presView = {
      ids: ['__me', '__media'],
      portMap: { __me: t('tu'), __media: t('mediaCategoria') },
      colore: { __me: COLORI[0], __media: GRIGIO },
      totale: { __me: meT, __media: medT },
      perMese: { __me: meMese, __media: medMese },
    }
    if (medie) {
      const ids = Object.keys(medie)
      const meV = medie[mioId] ?? null
      const altriV = ids.filter((x) => x !== mioId).map((x) => medie[x]).filter((v) => v != null)
      const medV = altriV.length ? Math.round((altriV.reduce((s, x) => s + x, 0) / altriV.length) * 10) / 10 : null
      medieView = {
        ids: ['__me', '__media'],
        portMap: { __me: t('tu'), __media: t('mediaCategoria') },
        colore: { __me: COLORI[0], __media: GRIGIO },
        valori: { __me: meV, __media: medV },
      }
    } else {
      medieView = { ids: [], portMap: {}, colore: {}, valori: {} }
    }
  }

  return (
    <div className="scheda" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>{titoloEff}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={metrica} onChange={(e) => setMetrica(e.target.value)} style={selStyle}>
            {metriche.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          {categorie.length > 1 && (
            <select value={cat} onChange={(e) => setCat(e.target.value)} style={selStyle}>
              <option value="all">{t('tutteCategorie')}</option>
              {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
        </div>
      </div>

      {metrica === 'presenze' ? (
        <>
          <div style={legendaStyle}>
            {presView.ids.map((id) => (
              <span key={id} style={legendaItem}>
                <span style={{ ...legendaQuad, background: presView.colore[id] }} />{presView.portMap[id]}
              </span>
            ))}
          </div>
          <h4 style={sottoTitolo}>{t('presenzeTotali')}</h4>
          <BarreValori portieri={presView.ids} portMap={presView.portMap} colore={presView.colore} valori={presView.totale} decimali={0} />
          <h4 style={{ ...sottoTitolo, marginTop: 16 }}>{t('presenzePerMese')}</h4>
          {mesi.length === 0
            ? <div className="empty" style={{ padding: '8px 0' }}>{t('nessunAllenamento')}</div>
            : <BarreMensili mesi={mesi} portieri={presView.ids} colore={presView.colore} perMese={presView.perMese} portMap={presView.portMap} />}
        </>
      ) : (
        <>
          <div style={legendaStyle}>
            {medieView.ids.map((id) => (
              <span key={id} style={legendaItem}>
                <span style={{ ...legendaQuad, background: medieView.colore[id] }} />{medieView.portMap[id]}
              </span>
            ))}
          </div>
          <h4 style={sottoTitolo}>{t('media', { label: metricaLabel.toLowerCase() })}{cat === 'all' ? t('suffTutte') : ''}</h4>
          {medieView.ids.length === 0
            ? <div className="empty" style={{ padding: '8px 0' }}>{t('nessunaValutazione')}</div>
            : <BarreValori portieri={medieView.ids} portMap={medieView.portMap} colore={medieView.colore} valori={medieView.valori} decimali={1} scalaMax={10} />}
        </>
      )}
    </div>
  )
}

const selStyle = { padding: '6px 10px', border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', font: 'inherit', fontSize: 13, background: 'var(--bianco)' }
const sottoTitolo = { margin: '0 0 6px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }
const legendaStyle = { display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 12 }
const legendaItem = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-soft)' }
const legendaQuad = { width: 10, height: 10, borderRadius: 2, flexShrink: 0 }

function Guscio({ titolo, children }) {
  return <div className="scheda" style={{ marginBottom: 16 }}><h3 style={{ marginTop: 0 }}>{titolo}</h3>{children}</div>
}

function BarreValori({ portieri, portMap, colore, valori, decimali = 0, scalaMax = null }) {
  const vOf = (id) => Number(valori[id] || 0)
  const maxV = Math.max(scalaMax ?? 1, ...portieri.map(vOf))
  const H = 130, PAD = { t: 16, b: 34, l: 26, r: 8 }
  const bw = 34, gap = 16
  const innerW = portieri.length * (bw + gap)
  const W = innerW + PAD.l + PAD.r
  const yBase = PAD.t + H
  const py = (v) => PAD.t + H - (v / maxV) * H
  const scroll = W > 340
  const fmt = (v) => (decimali > 0 ? v.toFixed(decimali) : String(v))
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg viewBox={`0 0 ${W} ${H + PAD.t + PAD.b}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: W, minWidth: scroll ? W : 'auto', maxWidth: scroll ? 'none' : '100%', height: 'auto', display: 'block', margin: scroll ? undefined : '0 auto' }}>
        {[0, 0.5, 1].map((f, i) => { const v = Math.round(maxV * f * 10) / 10; return (
          <g key={i}>
            <line x1={PAD.l} y1={py(v)} x2={W - PAD.r} y2={py(v)} stroke="#e2e6e1" strokeWidth="1" />
            <text x={PAD.l - 4} y={py(v) + 3} textAnchor="end" fontSize="9" fill="#4a5b68">{v}</text>
          </g>) })}
        {portieri.map((id, i) => { const x = PAD.l + i * (bw + gap) + gap / 2; const v = vOf(id); return (
          <g key={id}>
            <rect x={x} y={py(v)} width={bw} height={yBase - py(v)} fill={colore[id]} rx="2" />
            <text x={x + bw / 2} y={py(v) - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1a2b38">{fmt(v)}</text>
            <text x={x + bw / 2} y={yBase + 14} textAnchor="middle" fontSize="9" fill="#4a5b68">{(portMap[id] || '').split(' ')[0].slice(0, 8)}</text>
          </g>) })}
      </svg>
    </div>
  )
}

function BarreMensili({ mesi, portieri, colore, perMese, portMap }) {
  const t = useTranslations('confrontoPortieri')
  const mLabel = (m) => t('mese_' + String(m).slice(5, 7))
  const tutti = []
  for (const m of mesi) for (const id of portieri) tutti.push(perMese[id]?.[m] || 0)
  const maxV = Math.max(1, ...tutti)
  const H = 130, PAD = { t: 16, b: 30, l: 26, r: 8 }
  const bw = Math.max(6, Math.min(16, Math.round(110 / portieri.length)))
  const gapIn = 2, gapGroup = 18
  const groupW = portieri.length * (bw + gapIn)
  const innerW = mesi.length * (groupW + gapGroup)
  const W = innerW + PAD.l + PAD.r
  const yBase = PAD.t + H
  const py = (v) => PAD.t + H - (v / maxV) * H
  const scroll = W > 340
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg viewBox={`0 0 ${W} ${H + PAD.t + PAD.b}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: W, minWidth: scroll ? W : 'auto', maxWidth: scroll ? 'none' : '100%', height: 'auto', display: 'block', margin: scroll ? undefined : '0 auto' }}>
        {[0, 0.5, 1].map((f, i) => { const v = Math.round(maxV * f); return (
          <g key={i}>
            <line x1={PAD.l} y1={py(v)} x2={W - PAD.r} y2={py(v)} stroke="#e2e6e1" strokeWidth="1" />
            <text x={PAD.l - 4} y={py(v) + 3} textAnchor="end" fontSize="9" fill="#4a5b68">{v}</text>
          </g>) })}
        {mesi.map((m, gi) => { const gx = PAD.l + gi * (groupW + gapGroup) + gapGroup / 2; return (
          <g key={m}>
            {portieri.map((id, pi) => { const x = gx + pi * (bw + gapIn); const v = perMese[id]?.[m] || 0; return (
              <rect key={id} x={x} y={py(v)} width={bw} height={yBase - py(v)} fill={colore[id]} rx="1">
                <title>{portMap[id]} · {mLabel(m)}: {v}</title>
              </rect>) })}
            <text x={gx + groupW / 2} y={yBase + 13} textAnchor="middle" fontSize="9" fill="#4a5b68">{mLabel(m)}</text>
          </g>) })}
      </svg>
    </div>
  )
}
