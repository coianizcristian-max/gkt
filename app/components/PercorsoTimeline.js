'use client'

import { useTranslations, useLocale } from 'next-intl'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE' }
const TIPO_META = {
  obiettivo_creato:    { emoji: '🎯', colore: '#0a7ec2' },
  obiettivo_raggiunto: { emoji: '🏆', colore: '#1f8a4c' },
  voto_alto:           { emoji: '⭐', colore: '#1f8a4c' },
  voto_basso:          { emoji: '📉', colore: '#c0392b' },
  clean_sheet:         { emoji: '🧤', colore: '#7c3aed' },
  partita:             { emoji: '⚽', colore: '#4a5b68' },
}

function raggruppaPerMese(eventi) {
  const gruppi = {}
  for (const e of eventi) {
    const mese = (e.data ?? '').slice(0, 7)
    ;(gruppi[mese] ??= []).push(e)
  }
  return gruppi
}

export default function PercorsoTimeline({ eventi }) {
  const t = useTranslations('percorsoTimeline')
  const locale = useLocale()
  const dl = DATE_LOCALE[locale] || 'it-IT'
  const fmtData = (d) => (!d ? '' : new Date(d + 'T00:00:00').toLocaleDateString(dl, { day: 'numeric', month: 'long', year: 'numeric' }))
  const labelMese = (m) => {
    const [y, mm] = m.split('-')
    return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString(dl, { month: 'long', year: 'numeric' })
  }

  if (eventi.length === 0) {
    return <div className="empty">{t('vuoto')}</div>
  }

  const gruppi = raggruppaPerMese(eventi)
  const mesiOrd = Object.keys(gruppi).sort().reverse()

  return (
    <div>
      <p className="sub-intro" style={{ marginBottom: 20 }}>{t('intro')}</p>
      {mesiOrd.map((mese) => (
        <div key={mese} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            {labelMese(mese)}
          </div>
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: 'var(--linea)' }} />
            {gruppi[mese].map((e, i) => {
              const meta = TIPO_META[e.tipo] ?? { emoji: '•', colore: 'var(--ink-soft)' }
              const label = TIPO_META[e.tipo] ? t('tipo_' + e.tipo) : ''
              return (
                <div key={i} style={{ position: 'relative', marginBottom: 14 }}>
                  <div style={{ position: 'absolute', left: -24, top: 2, width: 16, height: 16, borderRadius: '50%', background: meta.colore, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, border: '2px solid var(--bianco)', boxShadow: '0 0 0 1px ' + meta.colore }} />
                  <div style={{ background: 'var(--bianco)', border: '1px solid var(--linea)', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: meta.colore }}>{meta.emoji} {label}</span>
                        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{e.titolo}</div>
                        {e.dettaglio && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{e.dettaglio}</div>}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{fmtData(e.data)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
