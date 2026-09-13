// Radar delle competenze (parametri di valutazione) del portiere, con
// overlay opzionale della media di categoria. SVG puro, nessuna dipendenza,
// coerente con lo stile degli altri grafici del sito. Server component.
//
// props:
//   assi: [{ id, nome, self: number|null, cat?: number|null }]  (scala 0..10)
//   max:  valore massimo della scala (default 10)
//   labelTu / labelCat: etichette legenda

export default function RadarCompetenze({ assi = [], max = 10, labelTu = 'Portiere', labelCat = 'Media categoria' }) {
  const punti = assi.filter((a) => a.self != null)
  if (punti.length < 3) return null

  const N = assi.length
  const W = 340, H = 300
  const cx = W / 2, cy = H / 2 + 6, R = 96
  const ring = [0.25, 0.5, 0.75, 1]
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]
  const poly = (key) => assi
    .map((a, i) => {
      const v = a[key]
      const r = v == null ? 0 : (Math.max(0, Math.min(max, v)) / max) * R
      const [x, y] = pt(i, r)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const hasCat = assi.some((a) => a.cat != null)
  const AZZ = '#0a7ec2', GRY = '#9aa6b0'

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8, fontSize: 12, color: 'var(--ink-soft)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 3, background: AZZ, borderRadius: 2 }} />{labelTu}
        </span>
        {hasCat && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 0, borderTop: `2px dashed ${GRY}` }} />{labelCat}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', maxWidth: 420, margin: '0 auto' }}>
        {ring.map((f, i) => (
          <polygon key={i}
            points={assi.map((_, j) => pt(j, R * f).map((n) => n.toFixed(1)).join(',')).join(' ')}
            fill="none" stroke="#e2e6e1" strokeWidth="1" />
        ))}
        {assi.map((_, i) => {
          const [x, y] = pt(i, R)
          return <line key={i} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="#e2e6e1" strokeWidth="1" />
        })}
        {hasCat && (
          <polygon points={poly('cat')} fill="none" stroke={GRY} strokeWidth="1.5" strokeDasharray="4 3" />
        )}
        <polygon points={poly('self')} fill="rgba(10,126,194,0.15)" stroke={AZZ} strokeWidth="2" />
        {assi.map((a, i) => {
          if (a.self == null) return null
          const r = (Math.max(0, Math.min(max, a.self)) / max) * R
          const [x, y] = pt(i, r)
          return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3" fill={AZZ} />
        })}
        {assi.map((a, i) => {
          const [x, y] = pt(i, R + 16)
          const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end'
          const nome = (a.nome ?? '').length > 16 ? (a.nome ?? '').slice(0, 15) + '…' : (a.nome ?? '')
          return (
            <text key={i} x={x.toFixed(1)} y={(y + 3).toFixed(1)} textAnchor={anchor} fontSize="10" fill="#4a5b68">
              {nome} {a.self != null ? <tspan fontWeight="700" fill="#1a2b38">{Number(a.self).toFixed(1)}</tspan> : null}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
