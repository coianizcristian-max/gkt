'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const MESI = { '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'Mag', '06': 'Giu', '07': 'Lug', '08': 'Ago', '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic' }
const COLORI = ['#0a7ec2', '#2fae66', '#e0a400', '#d6493b', '#7a5bd6', '#12a4a4', '#e0663b', '#4a5b68', '#c23fa0', '#5b8c00']
const mLabel = (m) => MESI[String(m).slice(5, 7)] ?? m

export default function ConfrontoPortieri({ stagioneId, titolo = 'Confronto portieri' }) {
  const [rows, setRows] = useState(null)
  const [cat, setCat] = useState('all')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.rpc('presenze_confronto', { p_stagione: stagioneId })
      if (vivo) setRows(data ?? [])
    })()
    return () => { vivo = false }
  }, [stagioneId])

  if (rows === null) return <Guscio titolo={titolo}><div className="empty" style={{ padding: '10px 0' }}>Carico…</div></Guscio>
  if (rows.length === 0) return <Guscio titolo={titolo}><div className="empty" style={{ padding: '10px 0' }}>Nessun dato.</div></Guscio>

  const catMap = {}
  for (const r of rows) if (r.squadra_id) catMap[r.squadra_id] = r.squadra_nome ?? 'Categoria'
  const categorie = Object.entries(catMap).map(([id, nome]) => ({ id, nome }))

  const filtrate = cat === 'all' ? rows : rows.filter((r) => r.squadra_id === cat)

  const portMap = {}
  for (const r of filtrate) portMap[r.portiere_id] = `${r.nome ?? ''} ${(r.cognome ?? '').slice(0, 1)}.`.trim()
  const portieri = Object.keys(portMap)
  const colore = {}
  portieri.forEach((id, i) => { colore[id] = COLORI[i % COLORI.length] })

  const mesiSet = new Set()
  for (const r of filtrate) if (r.mese) mesiSet.add(r.mese)
  const mesi = [...mesiSet].sort()

  const perMese = {}
  const totale = {}
  for (const id of portieri) { totale[id] = 0; perMese[id] = {} }
  for (const r of filtrate) {
    const n = Number(r.presenze) || 0
    totale[r.portiere_id] = (totale[r.portiere_id] || 0) + n
    if (r.mese) perMese[r.portiere_id][r.mese] = (perMese[r.portiere_id][r.mese] || 0) + n
  }

  return (
    <div className="scheda" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>{titolo}</h3>
        {categorie.length > 1 && (
          <select value={cat} onChange={(e) => setCat(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', font: 'inherit', fontSize: 13, background: 'var(--bianco)' }}>
            <option value="all">Tutte le categorie</option>
            {categorie.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 12 }}>
        {portieri.map((id) => (
          <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-soft)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colore[id], flexShrink: 0 }} />{portMap[id]}
          </span>
        ))}
      </div>

      <h4 style={sottoTitolo}>Presenze totali</h4>
      <BarreTotali portieri={portieri} portMap={portMap} colore={colore} totale={totale} />

      <h4 style={{ ...sottoTitolo, marginTop: 16 }}>Presenze per mese</h4>
      {mesi.length === 0
        ? <div className="empty" style={{ padding: '8px 0' }}>Nessun allenamento registrato.</div>
        : <BarreMensili mesi={mesi} portieri={portieri} colore={colore} perMese={perMese} portMap={portMap} />}
    </div>
  )
}

const sottoTitolo = { margin: '0 0 6px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }

function Guscio({ titolo, children }) {
  return <div className="scheda" style={{ marginBottom: 16 }}><h3 style={{ marginTop: 0 }}>{titolo}</h3>{children}</div>
}

// ─── Barre: presenze totali (una barra per portiere) ─────────────────────────
function BarreTotali({ portieri, portMap, colore, totale }) {
  const maxV = Math.max(1, ...portieri.map((id) => totale[id] || 0))
  const H = 130, PAD = { t: 16, b: 34, l: 26, r: 8 }
  const bw = 34, gap = 16
  const innerW = portieri.length * (bw + gap)
  const W = innerW + PAD.l + PAD.r
  const yBase = PAD.t + H
  const py = (v) => PAD.t + H - (v / maxV) * H
  const scroll = W > 340
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg viewBox={`0 0 ${W} ${H + PAD.t + PAD.b}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: scroll ? W : '100%', minWidth: scroll ? W : 'auto', maxWidth: scroll ? 'none' : '100%', height: 'auto', display: 'block' }}>
        {[0, 0.5, 1].map((f, i) => { const v = Math.round(maxV * f); return (
          <g key={i}>
            <line x1={PAD.l} y1={py(v)} x2={W - PAD.r} y2={py(v)} stroke="#e2e6e1" strokeWidth="1" />
            <text x={PAD.l - 4} y={py(v) + 3} textAnchor="end" fontSize="9" fill="#4a5b68">{v}</text>
          </g>) })}
        {portieri.map((id, i) => { const x = PAD.l + i * (bw + gap) + gap / 2; const v = totale[id] || 0; return (
          <g key={id}>
            <rect x={x} y={py(v)} width={bw} height={yBase - py(v)} fill={colore[id]} rx="2" />
            <text x={x + bw / 2} y={py(v) - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1a2b38">{v}</text>
            <text x={x + bw / 2} y={yBase + 14} textAnchor="middle" fontSize="9" fill="#4a5b68">{(portMap[id] || '').split(' ')[0].slice(0, 8)}</text>
          </g>) })}
      </svg>
    </div>
  )
}

// ─── Barre raggruppate: presenze per mese (gruppo = mese, barra = portiere) ───
function BarreMensili({ mesi, portieri, colore, perMese, portMap }) {
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
        style={{ width: scroll ? W : '100%', minWidth: scroll ? W : 'auto', maxWidth: scroll ? 'none' : '100%', height: 'auto', display: 'block' }}>
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
