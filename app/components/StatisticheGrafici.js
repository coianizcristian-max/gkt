'use client'

import { useState } from 'react'

const MESI_LABEL = { '01':'Gen','02':'Feb','03':'Mar','04':'Apr','05':'Mag','06':'Giu','07':'Lug','08':'Ago','09':'Set','10':'Ott','11':'Nov','12':'Dic' }
const mLabel = (d) => { const p = String(d).slice(0, 7).split('-'); return `${MESI_LABEL[p[1]] ?? p[1]}` }

function Grafico({ titolo, punti, colore = '#0a7ec2', tipo = 'line', yLabel = 'Voto', min = 4, max = 10, empty = 'Nessun dato disponibile.' }) {
  if (!punti || punti.length === 0) return (
    <div className="scheda" style={{ marginBottom: 14 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>{titolo}</h3>
      <div className="empty" style={{ padding: '12px 0' }}>{empty}</div>
    </div>
  )

  const yVals = punti.map((p) => p.y)
  const yMin = Math.min(...yVals, min)
  const yMax = Math.max(...yVals, max)
  const range = yMax - yMin || 1
  const W = 100 // viewBox width units per punto
  const H = 120
  const PAD = { t: 16, b: 28, l: 28, r: 8 }
  const chartW = (punti.length - 1) * W
  const totalW = chartW + PAD.l + PAD.r
  const totalH = H + PAD.t + PAD.b

  const px = (i) => PAD.l + i * W
  const py = (v) => PAD.t + H - ((v - yMin) / range) * H

  const pts = punti.map((p, i) => `${px(i)},${py(p.y)}`).join(' ')
  const area = `M${px(0)},${py(punti[0].y)} ` + punti.slice(1).map((p, i) => `L${px(i + 1)},${py(p.y)}`).join(' ') + ` L${px(punti.length - 1)},${PAD.t + H} L${px(0)},${PAD.t + H} Z`

  // Tick Y
  const ticks = [yMin, (yMin + yMax) / 2, yMax].map((v) => Math.round(v * 10) / 10)

  return (
    <div className="scheda" style={{ marginBottom: 14, overflowX: 'auto' }}>
      <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>{titolo}</h3>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg viewBox={`0 0 ${Math.max(totalW, 300)} ${totalH}`} style={{ minWidth: Math.max(punti.length * 60, 300), height: totalH, display: 'block' }}>
          {/* Griglia Y */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={py(t)} x2={totalW} y2={py(t)} stroke="#e2e6e1" strokeWidth="1" />
              <text x={PAD.l - 4} y={py(t) + 4} textAnchor="end" fontSize="9" fill="#4a5b68">{t}</text>
            </g>
          ))}

          {tipo === 'bar'
            ? punti.map((p, i) => (
              <g key={i}>
                <rect x={px(i) - W * 0.3} y={py(p.y)} width={W * 0.6} height={PAD.t + H - py(p.y)}
                  fill={colore} fillOpacity="0.8" rx="2" />
                <text x={px(i)} y={PAD.t + H + 14} textAnchor="middle" fontSize="9" fill="#4a5b68">{mLabel(p.x)}</text>
                <title>{p.label || p.x}: {p.y}</title>
              </g>
            ))
            : <>
              {/* Area riempimento */}
              <path d={area} fill={colore} fillOpacity="0.12" />
              {/* Linea */}
              <polyline points={pts} fill="none" stroke={colore} strokeWidth="2" strokeLinejoin="round" />
              {/* Punti */}
              {punti.map((p, i) => (
                <g key={i}>
                  <circle cx={px(i)} cy={py(p.y)} r="3.5" fill={colore} stroke="#fff" strokeWidth="1.5" />
                  <text x={px(i)} y={PAD.t + H + 14} textAnchor="middle" fontSize="9" fill="#4a5b68">
                    {p.label ? p.label.slice(0, 6) : mLabel(p.x)}
                  </text>
                  <title>{p.label || p.x}: {p.y}</title>
                </g>
              ))}
            </>}
        </svg>
      </div>
    </div>
  )
}

export default function StatisticheGrafici({ dati, nomPortiere }) {
  const { g1, g2, g3, g4, g5, g6, g7, mesi, votiMese } = dati

  return (
    <div>
      <h2 className="sezione-titolo">Grafici stagione</h2>

      <Grafico
        titolo="1. Andamento voti allenamenti — ultimi 30 giorni"
        punti={g1} colore="#0a7ec2" min={4} max={10}
        empty="Nessun allenamento con voto negli ultimi 30 giorni."
      />
      <Grafico
        titolo="2. Andamento voti allenamenti — tutta la stagione"
        punti={g2} colore="#0a7ec2" min={4} max={10}
        empty="Nessun allenamento con voto questa stagione."
      />
      <Grafico
        titolo="3. Andamento voti — ultime 10 partite"
        punti={g3} colore="#7c3aed" min={4} max={10}
        empty="Nessuna partita con voto registrata."
      />
      <Grafico
        titolo="4. Andamento voti — partite di campionato"
        punti={g4} colore="#7c3aed" min={4} max={10}
        empty="Nessuna partita di campionato giocata."
      />
      <Grafico
        titolo="5. Gol subiti progressivi — campionato"
        punti={g5} colore="#c0392b" min={0} max={Math.max(...(g5.map((p) => p.y)), 5)}
        empty="Nessuna partita di campionato registrata."
      />
      {g6.length > 0 && (
        <Grafico
          titolo="6. Gol subiti progressivi — coppa"
          punti={g6} colore="#e8a72c" min={0} max={Math.max(...g6.map((p) => p.y), 5)}
        />
      )}
      {g7.length > 0 && (
        <div className="scheda" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>7. Presenze mensili — {nomPortiere}</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', overflowX: 'auto' }}>
            {g7.map((m) => {
              const max = Math.max(...g7.map((x) => x.io), 1)
              return (
                <div key={m.mese} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 36 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0a7ec2' }}>{m.io}</div>
                  <div style={{ width: 28, borderRadius: '3px 3px 0 0', background: '#0a7ec2', height: `${Math.round((m.io / max) * 60)}px`, minHeight: 3 }} />
                  <div style={{ fontSize: 9, color: '#4a5b68' }}>{MESI_LABEL[m.mese.slice(5)] ?? m.mese.slice(5)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
