'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'

const NUM_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }

function leggiPref(chiave, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const v = window.localStorage.getItem(chiave)
    return v == null ? fallback : JSON.parse(v)
  } catch { return fallback }
}

function scriviPref(chiave, valore) {
  try { window.localStorage.setItem(chiave, JSON.stringify(valore)) } catch { /* quota o privacy mode */ }
}

function Grafico({ serie, etichette, nl }) {
  const visibili = serie.filter((s) => s.punti.some((p) => p != null))
  if (visibili.length === 0 || etichette.length === 0) return null

  const vals = visibili.flatMap((s) => s.punti.filter((p) => p != null))
  const vMin = Math.min(...vals)
  const vMax = Math.max(...vals)
  const lo = Math.floor((vMin - (vMax - vMin || 1) * 0.15) * 10) / 10
  const hi = Math.ceil((vMax + (vMax - vMin || 1) * 0.15) * 10) / 10
  const range = hi - lo || 1

  const H = 120
  const PAD = { t: 12, b: 24, l: 34, r: 8 }
  const W = 560
  const innerW = W - PAD.l - PAD.r
  const n = etichette.length
  const px = (i) => (n > 1 ? PAD.l + (i / (n - 1)) * innerW : PAD.l + innerW / 2)
  const py = (v) => PAD.t + H - ((v - lo) / range) * H
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => Math.round(v * 10) / 10)

  return (
    <div style={{ marginBottom: 12 }}>
      <svg viewBox={`0 0 ${W} ${H + PAD.t + PAD.b}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={py(v)} y2={py(v)} stroke="var(--linea)" strokeWidth="1" />
            <text x={PAD.l - 6} y={py(v) + 3} textAnchor="end" fontSize="10" fill="var(--ink-soft)">
              {v.toLocaleString(nl, { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}
        {etichette.map((m, i) => (
          <text key={i} x={px(i)} y={H + PAD.t + 16} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">{m}</text>
        ))}
        {visibili.map((s, si) => {
          const segmenti = []
          let corrente = []
          s.punti.forEach((v, i) => {
            if (v == null) { if (corrente.length) segmenti.push(corrente); corrente = [] }
            else corrente.push(`${px(i)},${py(v)}`)
          })
          if (corrente.length) segmenti.push(corrente)
          return (
            <g key={si}>
              {segmenti.map((seg, k) => (
                <polyline key={k} points={seg.join(' ')} fill="none" stroke={s.colore}
                  strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {s.punti.map((v, i) => v == null ? null : (
                <circle key={i} cx={px(i)} cy={py(v)} r="2.5" fill={s.colore} stroke="var(--bianco)" strokeWidth="1.5" />
              ))}
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
        {visibili.map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-soft)' }}>
            <i style={{ width: 10, height: 3, borderRadius: 2, background: s.colore, display: 'inline-block' }} />
            {s.nome}
          </span>
        ))}
      </div>
    </div>
  )
}

function Blocco({ titolo, mesi, colonne, prefModo, prefColonne, nl, t }) {
  const [modo, setModo] = useState('mensile')
  const [attive, setAttive] = useState(() => colonne.filter((c) => c.default !== false).map((c) => c.id))
  const [aperto, setAperto] = useState(false)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    setModo(leggiPref(prefModo, 'mensile'))
    const salvate = leggiPref(prefColonne, null)
    if (Array.isArray(salvate) && salvate.length) {
      const valide = salvate.filter((id) => colonne.some((c) => c.id === id))
      if (valide.length) setAttive(valide)
    }
    setPronto(true)
  }, [prefModo, prefColonne]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (pronto) scriviPref(prefModo, modo) }, [modo, pronto, prefModo])
  useEffect(() => { if (pronto) scriviPref(prefColonne, attive) }, [attive, pronto, prefColonne])

  const cols = colonne.filter((c) => attive.includes(c.id))

  const valori = useMemo(() => mesi.map((m, i) => {
    const out = {}
    if (m.parziale) { colonne.forEach((c) => { out[c.id] = { num: null, testo: '—' } }); return out }
    const da = modo === 'progressivo' ? 0 : i
    const fetta = mesi.slice(da, i + 1).filter((x) => !x.parziale)
    colonne.forEach((c) => { out[c.id] = c.calcola(fetta) })
    return out
  }), [mesi, modo, colonne])

  const serie = cols.filter((c) => c.grafico !== false).map((c) => ({
    nome: c.nome,
    colore: c.colore,
    punti: valori.map((v) => (v[c.id]?.num == null ? null : v[c.id].num)),
  }))

  return (
    <div className="scheda" style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, flex: '0 0 auto' }}>{titolo}</h3>
        <div className="sub-nav" style={{ marginBottom: 0 }}>
          <button type="button" className={`sub-nav-link ${modo === 'mensile' ? 'active' : ''}`}
            onClick={() => setModo('mensile')}>{t('mensile')}</button>
          <button type="button" className={`sub-nav-link ${modo === 'progressivo' ? 'active' : ''}`}
            onClick={() => setModo('progressivo')}>{t('progressivo')}</button>
        </div>
        <button type="button" className="btn-mini" style={{ marginLeft: 'auto' }}
          onClick={() => setAperto((a) => !a)}>{t('colonne')}</button>
      </div>

      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-soft)' }}>
        {modo === 'mensile' ? t('spiegaMensile') : t('spiegaProgressivo')}{' '}
        {mesi.some((m) => m.parziale) && t('meseInCorso')}
      </p>

      {aperto && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 0 14px' }}>
          {colonne.map((c) => {
            const on = attive.includes(c.id)
            return (
              <button key={c.id} type="button" className="btn-mini"
                style={on ? { background: 'var(--azzurro-scuro)', color: 'var(--bianco)', borderColor: 'var(--azzurro-scuro)' } : undefined}
                onClick={() => setAttive((a) => (on ? a.filter((x) => x !== c.id) : [...a, c.id]))}>
                {c.nome}
              </button>
            )
          })}
        </div>
      )}

      {cols.length === 0
        ? <div className="empty" style={{ padding: '12px 0' }}>{t('nessunaColonna')}</div>
        : (
          <>
            <Grafico serie={serie} etichette={mesi.map((m) => m.label)} nl={nl} />
            <div style={{ overflowX: 'auto' }}>
              <table className="tabella" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 10px' }}>{t('mese')}</th>
                    {cols.map((c) => (
                      <th key={c.id} style={{ textAlign: 'right', padding: '8px 10px', whiteSpace: 'nowrap' }}>{c.nome}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mesi.map((m, i) => (
                    <tr key={m.key} style={{ borderTop: '1px solid var(--linea)' }}>
                      <td style={{ padding: '8px 10px', color: m.parziale ? 'var(--ink-soft)' : undefined }}>{m.label}</td>
                      {cols.map((c) => (
                        <td key={c.id} style={{ textAlign: 'right', padding: '8px 10px' }}>
                          {valori[i][c.id]?.testo ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
    </div>
  )
}

export default function AndamentoMensile({ mesi, parametri, portiereId }) {
  const t = useTranslations('andamento')
  const locale = useLocale()
  const nl = NUM_LOCALE[locale] || 'it-IT'

  const num = (v, dec = 2) => (v == null ? { num: null, testo: '—' }
    : { num: v, testo: Number(v).toLocaleString(nl, { maximumFractionDigits: dec, minimumFractionDigits: dec }) })
  const intero = (v) => (v == null ? { num: null, testo: '—' } : { num: v, testo: String(v) })
  const media = (f, s) => {
    const tot = f.reduce((a, m) => a + s(m).n, 0)
    if (!tot) return null
    return f.reduce((a, m) => a + s(m).s, 0) / tot
  }

  const colGenerali = [
    { id: 'presenze', nome: t('presenze'), colore: '#1f8a4c', calcola: (f) => {
      const tot = f.reduce((a, m) => a + m.allTot, 0)
      if (!tot) return { num: null, testo: '—' }
      const p = f.reduce((a, m) => a + m.allPres, 0)
      const v = Math.round((p / tot) * 100)
      return { num: v, testo: `${v}%`, }
    }, grafico: false },
    { id: 'voto', nome: t('mediaVoto'), colore: '#0a7ec2', calcola: (f) => num(media(f, (m) => ({ s: m.votoSum, n: m.votoN }))) },
    { id: 'stelle', nome: t('stelle'), colore: '#e8a72c', default: false, calcola: (f) => num(media(f, (m) => ({ s: m.stelleSum, n: m.stelleN })), 1) },
    { id: 'giocate', nome: t('giocate'), colore: '#888780', calcola: (f) => intero(f.reduce((a, m) => a + m.parGio, 0) || null) },
    { id: 'votoPartita', nome: t('votoPartita'), colore: '#7f77dd', calcola: (f) => num(media(f, (m) => ({ s: m.parVotoSum, n: m.parVotoN }))) },
    { id: 'golSubiti', nome: t('golSubiti'), colore: '#c0392b', calcola: (f) => {
      const g = f.reduce((a, m) => a + m.parGio, 0)
      return g ? intero(f.reduce((a, m) => a + m.parGolSub, 0)) : { num: null, testo: '—' }
    } },
    { id: 'cleanSheet', nome: t('cleanSheet'), colore: '#1d9e75', calcola: (f) => {
      const g = f.reduce((a, m) => a + m.parGio, 0)
      return g ? intero(f.reduce((a, m) => a + m.parClean, 0)) : { num: null, testo: '—' }
    } },
    { id: 'punti', nome: t('punti'), colore: '#d85a30', calcola: (f) => {
      const g = f.reduce((a, m) => a + m.parGio, 0)
      if (!g) return { num: null, testo: '—' }
      const p = f.reduce((a, m) => a + m.parPunti, 0)
      return { num: p, testo: p > 0 ? `+${p}` : String(p) }
    } },
  ]

  const PALETTE = ['#0a7ec2', '#1f8a4c', '#7f77dd', '#d85a30', '#e8a72c', '#1d9e75', '#888780', '#c0392b']
  const colParametri = parametri.map((p, i) => ({
    id: `p${p.id}`,
    nome: p.nome,
    colore: PALETTE[i % PALETTE.length],
    default: !p.rpe,
    calcola: (f) => num(media(f, (m) => ({ s: m.par[p.id]?.s ?? 0, n: m.par[p.id]?.n ?? 0 }))),
  }))

  if (!mesi.length) return <div className="empty">{t('nessunDato')}</div>

  return (
    <>
      <Blocco titolo={t('bloccoGenerali')} mesi={mesi} colonne={colGenerali} nl={nl} t={t}
        prefModo="gk:andamento:generali:modo" prefColonne="gk:andamento:generali:colonne" />
      {colParametri.length > 0 && (
        <Blocco titolo={t('bloccoParametri')} mesi={mesi} colonne={colParametri} nl={nl} t={t}
          prefModo="gk:andamento:parametri:modo" prefColonne="gk:andamento:parametri:colonne" />
      )}
    </>
  )
}
