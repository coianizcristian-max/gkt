'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/** Popup di benvenuto in modalita' demo: stesso stile di VersionePopup. */
export default function DemoPopup({ dataTaglio }) {
  const t = useTranslations('demo')
  const [visible, setVisible] = useState(true)
  const [closing, setClosing] = useState(false)

  async function chiudi() {
    setClosing(true)
    await fetch('/api/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'avviso-visto' }),
    })
    setVisible(false)
  }

  if (!visible) return null

  const punti = ['punto1', 'punto2', 'punto3', 'punto4']

  return (
    <div className="versione-overlay">
      <div className={`versione-popup ${closing ? 'closing' : ''}`}>
        <div className="versione-header">
          <div>
            <div className="demo-badge">{t('badge')}</div>
            <h2 className="versione-titolo demo-titolo">{t('popupTitolo')}</h2>
            <div className="versione-numero">{t('bannerData', { data: dataTaglio })}</div>
          </div>
          <button className="versione-close" onClick={chiudi} type="button">✕</button>
        </div>

        <div className="versione-body">
          <p className="versione-intro">{t('popupIntro', { data: dataTaglio })}</p>
          <ul className="versione-lista">
            {punti.map((k) => (
              <li key={k} className="versione-item">
                <span className="versione-bullet">✓</span>
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
          <div className="demo-uscita">{t('comeUscire')}</div>
        </div>

        <div className="versione-footer">
          <button className="btn" onClick={chiudi} type="button">{t('popupChiudi')}</button>
        </div>
      </div>
    </div>
  )
}
