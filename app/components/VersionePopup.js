'use client'

import { useState } from 'react'

export default function VersionePopup({ versione }) {
  const [visible, setVisible] = useState(true)
  const [closing, setClosing] = useState(false)

  async function chiudi() {
    setClosing(true)
    await fetch('/api/versione-vista', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versione_id: versione.id }),
    })
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="versione-overlay">
      <div className={`versione-popup ${closing ? 'closing' : ''}`}>
        <div className="versione-header">
          <div>
            <div className="versione-badge">🚀 Aggiornamento</div>
            <h2 className="versione-titolo">
              {versione.titolo || `Versione ${versione.numero}`}
            </h2>
            <div className="versione-numero">v{versione.numero}</div>
          </div>
          <button className="versione-close" onClick={chiudi} type="button">✕</button>
        </div>

        <div className="versione-body">
          <p className="versione-intro">
            GKSeason è stato aggiornato. Ecco le novità di questa versione:
          </p>
          <ul className="versione-lista">
            {(versione.note ?? []).map((nota, i) => (
              <li key={i} className="versione-item">
                <span className="versione-bullet">✓</span>
                <span>{nota}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="versione-footer">
          <button className="btn" onClick={chiudi} type="button">
            Ho capito, continua →
          </button>
        </div>
      </div>
    </div>
  )
}
