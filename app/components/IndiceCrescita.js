import { interpretaIndice } from '@/lib/indiceCrescita'

export default function IndiceCrescita({ score, dettagli, provvisorio = false }) {
  const info = interpretaIndice(score, provvisorio)
  const pct = score ?? 0
  const circonferenza = 2 * Math.PI * 42
  const offset = circonferenza - (pct / 100) * circonferenza

  return (
    <div className="scheda" style={{ marginBottom: 14 }}>
      <h3 style={{ marginTop: 0, marginBottom: 14 }}>📊 Indice di Crescita GKSeason</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--linea)" strokeWidth="10" />
            {score != null && (
              <circle cx="50" cy="50" r="42" fill="none" stroke={info.colore} strokeWidth="10"
                strokeDasharray={circonferenza} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s' }} />
            )}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: info.colore, lineHeight: 1 }}>{score ?? '—'}</span>
            {score != null && <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>/ 100</span>}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: info.colore, marginBottom: 8 }}>{info.label}</div>
          {provvisorio && <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 8 }}>Il punteggio si stabilizza con più allenamenti e valutazioni.</div>}
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
            {dettagli.map((d) => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span>{d.label} ({d.peso}%)</span>
                <b style={{ color: d.valore != null ? 'var(--ink)' : 'var(--ink-soft)' }}>
                  {d.valore != null ? d.display : 'n/d'}
                </b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
