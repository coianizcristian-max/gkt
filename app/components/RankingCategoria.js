'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

const num = (v, dec = 2) => (v == null ? '—' : Number(v).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec }))

export default function RankingCategoria({ righe = [] }) {
  const t = useTranslations('statisticheClient')
  const [key, setKey] = useState('mediaA')
  const [dir, setDir] = useState('desc')

  const cols = [
    { key: 'mediaA', label: t('mediaVoto'), get: (r) => r.mediaA, fmt: (v) => num(v, 2) },
    { key: 'presenzaPct', label: t('presenze'), get: (r) => r.presenzaPct, fmt: (v) => (v == null ? '—' : v + '%') },
    { key: 'mediaP', label: t('mediaGara'), get: (r) => r.mediaP, fmt: (v) => num(v, 2) },
    { key: 'cleanSheet', label: t('cleanSheet'), get: (r) => r.cleanSheet, fmt: (v) => (v == null ? '—' : String(v)) },
    { key: 'golSubitiGara', label: t('golGara'), get: (r) => r.golSubitiGara, fmt: (v) => num(v, 2) },
  ]

  const sorted = [...righe].sort((a, b) => {
    const col = cols.find((c) => c.key === key)
    const va = col.get(a), vb = col.get(b)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    return dir === 'asc' ? va - vb : vb - va
  })

  const clicca = (k) => {
    if (k === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setKey(k); setDir('desc') }
  }
  const freccia = (k) => (k === key ? (dir === 'asc' ? ' ↑' : ' ↓') : '')

  return (
    <div className="rank-wrap">
      <table className="rank-tab">
        <thead>
          <tr>
            <th className="rank-num">#</th>
            <th className="rank-nome">{t('colPortiere')}</th>
            {cols.map((c) => (
              <th key={c.key} onClick={() => clicca(c.key)} className={'rank-col' + (c.key === key ? ' rank-active' : '')}>
                {c.label}{freccia(c.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.id}>
              <td className="rank-num">{i + 1}</td>
              <td className="rank-nome">
                <Link href={`/portieri/${r.id}/statistiche`} className="rank-link">{r.nome}</Link>
              </td>
              {cols.map((c) => (
                <td key={c.key} className={'rank-cell' + (c.key === key ? ' rank-active' : '')}>{c.fmt(c.get(r))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
