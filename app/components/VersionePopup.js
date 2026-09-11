'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function VersionePopup({ versione }) {
  const t = useTranslations('versionePopup')
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
            <div className="versione-badge">{t('badge')}</div>
            <h2 className="versione-titolo">
              {versione.titolo || t('versioneN', { n: versione.numero })}
            </h2>
            <div className="versione-numero">v{versione.numero}</div>
          </div>
          <button className="versione-close" onClick={chiudi} type="button">✕</button>
        </div>

        <div className="versione-body">
          <p className="versione-intro">{t('intro')}</p>
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
          <button className="btn" onClick={chiudi} type="button">{t('continua')}</button>
        </div>
      </div>
    </div>
  )
}
