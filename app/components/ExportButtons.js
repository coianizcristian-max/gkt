'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function ExportButtons({ stagioneId }) {
  const t = useTranslations('exportDati')
  const [loading, setLoading] = useState(null)

  async function scarica(tipo) {
    setLoading(tipo)
    try {
      const url = `/api/export?tipo=${tipo}&stagione=${stagioneId}`
      const res = await fetch(url)
      if (!res.ok) { alert(t('erroreExport')); return }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${tipo}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) { alert(t('errore', { msg: e.message })) }
    setLoading(null)
  }

  return (
    <div className="export-bar">
      <span className="sub-intro" style={{ margin: 0 }}>{t('esporta')}</span>
      {['portieri', 'valutazioni', 'partite'].map((tipo) => (
        <button key={tipo} type="button" className="btn-ghost export-btn"
          onClick={() => scarica(tipo)} disabled={!!loading}>
          {loading === tipo ? t('scaricamento') : t('csv', { tipo: t(tipo) })}
        </button>
      ))}
    </div>
  )
}
