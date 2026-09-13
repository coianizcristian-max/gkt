// Scorecard KPI in stile dashboard per la scheda del portiere.
// Server component, SVG puro. Ogni tile: label, valore grande, sotto-valore
// opzionale (es. "forma"), e sparkline opzionale.
//
// props.tiles: [{ label, value, valColor?, sub?, subColor?, spark?: number[] }]

function Spark({ dati }) {
  const vals = (dati ?? []).filter((v) => v != null).map(Number)
  if (vals.length < 2) return null
  const W = 120, H = 26, P = 2
  const min = Math.min(...vals), max = Math.max(...vals)
  const span = max - min || 1
  const x = (i) => P + (i * (W - 2 * P)) / (vals.length - 1)
  const y = (v) => H - P - ((v - min) / span) * (H - 2 * P)
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const lx = x(vals.length - 1), ly = y(vals[vals.length - 1])
  return (
    <svg className="sc-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke="var(--azzurro)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx.toFixed(1)} cy={ly.toFixed(1)} r="2.2" fill="var(--azzurro)" />
    </svg>
  )
}

export default function ScorecardPortiere({ tiles = [] }) {
  return (
    <div className="sc-grid">
      {tiles.map((t, i) => (
        <div key={i} className="sc-tile">
          <div className="sc-label">{t.label}</div>
          <div className="sc-valrow">
            <span className="sc-val" style={t.valColor ? { color: t.valColor } : undefined}>{t.value}</span>
            {t.sub != null && <span className="sc-sub" style={t.subColor ? { color: t.subColor } : undefined}>{t.sub}</span>}
          </div>
          {t.spark && <Spark dati={t.spark} />}
        </div>
      ))}
    </div>
  )
}
