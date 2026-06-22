'use client'

import { useState } from 'react'

const MESI_LABEL = { '01':'Gen','02':'Feb','03':'Mar','04':'Apr','05':'Mag','06':'Giu','07':'Lug','08':'Ago','09':'Set','10':'Ott','11':'Nov','12':'Dic' }
const mLabel = (d) => { const p = String(d).slice(0, 7).split('-'); return `${MESI_LABEL[p[1]] ?? p[1]}` }

function Grafico({ titolo, punti, colore = '#0a7ec2', tipo = 'line', min = 4, max = 10, empty = 'Nessun dato disponibile.' }) {
  const [espanso, setEspanso] = useState(false)

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
  const H = 130
  const PAD = { t: 16, b: 28, l: 30, r: 10 }

  // Modalità compatta (default): viewBox a larghezza fissa 100 unità, sempre dentro lo schermo,
  // i punti si comprimono automaticamente in base a quanti sono.
  // Modalità espansa: ogni punto occupa uno spazio minimo fisso e si scrolla orizzontalmente.
  const VIEW_W_COMPATTO = 340
  const W_PUNTO_ESPANSO = punti.length > 1 ? 56 : 100

  const innerW = espanso
    ? Math.max((punti.length - 1) * W_PUNTO_ESPANSO, 200)
    : (VIEW_W_COMPATTO - PAD.l - PAD.r)

  const totalW = innerW + PAD.l + PAD.r
  const totalH = H + PAD.t + PAD.b

  const px = (i) => punti.length > 1
    ? PAD.l + (i / (punti.length - 1)) * innerW
    : PAD.l + innerW / 2
  const py = (v) => PAD.t + H - ((v - yMin) / range) * H

  const pts = punti.map((p, i) => `${px(i)},${py(p.y)}`).join(' ')
  const area = punti.length > 1
    ? `M${px(0)},${py(punti[0].y)} ` + punti.slice(1).map((p, i) => `L${px(i + 1)},${py(p.y)}`).join(' ') + ` L${px(punti.length - 1)},${PAD.t + H} L${px(0)},${PAD.t + H} Z`
    : ''

  const ticks = [yMin, (yMin + yMax) / 2, yMax].map((v) => Math.round(v * 10) / 10)

  // In modalità compatta mostriamo solo alcune etichette X per non sovrapporle (max ~6)
  const everyN = espanso ? 1 : Math.max(1, Math.ceil(punti.length / 6))

  return (
    <div className="scheda" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>{titolo}</h3>
        {punti.length > 6 && (
          <button type="button" onClick={() => setEspanso((v) => !v)}
            style={{ fontSize: 11, fontWeight: 600, color: colore, background: 'none', border: `1px solid ${colore}`, borderRadius: 999, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}>
            {espanso ? '↙ Comprimi' : '🔍 Espandi'}
          </button>
        )}
      </div>
      <div style={{ overflowX: espanso ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
        <svg
          viewBox={`0 0 ${totalW} ${totalH}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: espanso ? Math.max(totalW, 300) : '100%',
            minWidth: espanso ? Math.max(totalW, 300) : 'auto',
            height: 'auto',
            display: 'block',
          }}
        >
          {/* Griglia Y */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.l} y1={py(t)} x2={totalW - PAD.r} y2={py(t)} stroke="#e2e6e1" strokeWidth="1" />
              <text x={PAD.l - 4} y={py(t) + 4} textAnchor="end" fontSize="9" fill="#4a5b68">{t}</text>
            </g>
          ))}

          {tipo === 'bar'
            ? punti.map((p, i) => {
                const barW = Math.min(innerW / punti.length * 0.6, 28)
                return (
                  <g key={i}>
                    <rect x={px(i) - barW / 2} y={py(p.y)} width={barW} height={PAD.t + H - py(p.y)}
                      fill={colore} fillOpacity="0.8" rx="2" />
                    {i % everyN === 0 && (
                      <text x={px(i)} y={PAD.t + H + 14} textAnchor="middle" fontSize="9" fill="#4a5b68">{mLabel(p.x)}</text>
                    )}
                    <title>{p.label || p.x}: {p.y}</title>
                  </g>
                )
              })
            : <>
              {area && <path d={area} fill={colore} fillOpacity="0.12" />}
              <polyline points={pts} fill="none" stroke={colore} strokeWidth="2" strokeLinejoin="round" />
              {punti.map((p, i) => (
                <g key={i}>
                  <circle cx={px(i)} cy={py(p.y)} r={espanso ? 3.5 : 2.5} fill={colore} stroke="#fff" strokeWidth="1.5" />
                  {(espanso || i % everyN === 0 || i === punti.length - 1) && (
                    <text x={px(i)} y={PAD.t + H + 14} textAnchor="middle" fontSize="9" fill="#4a5b68">
                      {p.label ? p.label.slice(0, 6) : mLabel(p.x)}
                    </text>
                  )}
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
  const { g1, g2, g3, g4, g5, g6, g7 } = dati

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
        <Grafico
          titolo={`7. Presenze mensili — ${nomPortiere}`}
          punti={g7.map((m) => ({ x: m.mese + '-01', y: m.io }))}
          colore="#1f8a4c" tipo="bar" min={0} max={Math.max(...g7.map((m) => m.io), 5)}
        />
      )}
    </div>
  )
}
