'use client'

import { useTranslations } from 'next-intl'

const AZZ = '#0a7ec2', LINEA = '#e2e6e1', INK = '#4a5b68'

export default function GradimentoGrafici({ dati }) {
  const t = useTranslations('statisticheClient')
  const g = dati ?? {}
  const distrib = g.distribuzione ?? [0, 0, 0, 0, 0]
  const perSeduta = g.perSeduta ?? []
  const nVoti = g.nVoti ?? 0

  if (!nVoti) {
    return (
      <div className="scheda" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>{t('gradimentoTitolo')}</h3>
        <div className="empty" style={{ padding: '8px 0' }}>{t('gradimentoVuoto')}</div>
      </div>
    )
  }

  const maxD = Math.max(1, ...distrib)

  return (
    <div className="scheda" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{t('gradimentoTitolo')}</h3>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          {t('gradimentoMedia')} <b style={{ color: AZZ, fontSize: 16 }}>{g.media != null ? g.media.toFixed(1) : '—'}</b> / 5 · {t('gradimentoNVoti', { n: nVoti })}
        </div>
      </div>

      <div className="comp-grid">
        <div>
          <h4 style={{ margin: '0 0 6px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>{t('distribuzioneVoti')}</h4>
          <svg viewBox="0 0 320 170" style={{ width: '100%', height: 'auto', display: 'block' }}>
            {distrib.map((c, i) => {
              const bw = 42, gap = 14, x = 18 + i * (bw + gap)
              const h = (c / maxD) * 120
              const y = 140 - h
              return (
                <g key={i}>
                  <rect x={x} y={y} width={bw} height={h} fill={AZZ} rx="3" />
                  <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a2b38">{c}</text>
                  <text x={x + bw / 2} y={158} textAnchor="middle" fontSize="12" fill={INK}>{'★'.repeat(i + 1)}</text>
                </g>
              )
            })}
          </svg>
        </div>

        <div>
          <h4 style={{ margin: '0 0 6px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>{t('andamentoGradimento')}</h4>
          {perSeduta.length < 2 ? (
            <div className="empty" style={{ padding: '8px 0' }}>{t('gradimentoPochiDati')}</div>
          ) : (
            <Linea perSeduta={perSeduta} />
          )}
        </div>
      </div>
    </div>
  )
}

function Linea({ perSeduta }) {
  const W = 320, H = 170, PAD = { t: 14, b: 26, l: 24, r: 8 }
  const n = perSeduta.length
  const x = (i) => PAD.l + (i * (W - PAD.l - PAD.r)) / (n - 1)
  const y = (v) => PAD.t + (5 - v) / 4 * (H - PAD.t - PAD.b)
  const d = perSeduta.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.media).toFixed(1)}`).join(' ')
  const fmtData = (s) => { const d = new Date(s + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}` }
  const step = Math.ceil(n / 6)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} stroke={LINEA} strokeWidth="1" />
          <text x={PAD.l - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill={INK}>{v}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={AZZ} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {perSeduta.map((p, i) => (
        <g key={i}>
          <circle cx={x(i).toFixed(1)} cy={y(p.media).toFixed(1)} r="2.6" fill={AZZ}>
            <title>{fmtData(p.data)}: {p.media.toFixed(1)} ({p.n})</title>
          </circle>
          {i % step === 0 && <text x={x(i).toFixed(1)} y={H - 8} textAnchor="middle" fontSize="8" fill={INK}>{fmtData(p.data)}</text>}
        </g>
      ))}
    </svg>
  )
}
