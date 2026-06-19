'use client'

import { useState } from 'react'

export default function ExportButtons({ stagioneId }) {
  const [loading, setLoading] = useState(null)

  async function scarica(tipo) {
    setLoading(tipo)
    try {
      const url = `/api/export?tipo=${tipo}&stagione=${stagioneId}`
      const res = await fetch(url)
      if (!res.ok) { alert('Errore durante l\'export.'); return }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${tipo}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) { alert('Errore: ' + e.message) }
    setLoading(null)
  }

  return (
    <div className="export-bar">
      <span className="sub-intro" style={{ margin: 0 }}>Esporta dati:</span>
      {['portieri', 'valutazioni', 'partite'].map((tipo) => (
        <button key={tipo} type="button" className="btn-ghost export-btn"
          onClick={() => scarica(tipo)} disabled={!!loading}>
          {loading === tipo ? '⏳ Download...' : `⬇ ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} CSV`}
        </button>
      ))}
    </div>
  )
}
