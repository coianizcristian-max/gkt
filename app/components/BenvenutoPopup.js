'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function BenvenutoPopup({ nome, giorni, ruolo, mostraPiani = false, demoDisponibile = false }) {
  const t = useTranslations('benvenutoPopup')
  const [visible, setVisible] = useState(true)
  const [closing, setClosing] = useState(false)

  async function chiudi() {
    setClosing(true)
    try {
      await fetch('/api/benvenuto-visto', { method: 'POST' })
    } catch { /* non bloccante */ }
    setVisible(false)
  }

  if (!visible) return null
  const conGiorni = Number(giorni) > 0

  return (
    <div className="versione-overlay">
      <div className={`versione-popup ${closing ? 'closing' : ''}`}>
        <div className="versione-header">
          <div>
            <div className="versione-badge">{t('badge')}</div>
            <h2 className="versione-titolo">
              {t('titolo', { nome: nome ? ` ${nome}` : '' })}
            </h2>
          </div>
          <button className="versione-close" onClick={chiudi} type="button">✕</button>
        </div>

        <div className="versione-body">
          <p className="versione-intro">{ruolo === 'portiere' ? t('sottotitoloPortiere') : t('sottotitoloCoach')}</p>
          {conGiorni && (
            <p className="versione-intro" style={{ marginTop: 12 }}>
              {t.rich('prova', { giorni, b: (ch) => <b>{ch}</b> })}
            </p>
          )}
          {demoDisponibile && (
            <div className="demo-uscita" style={{ marginTop: 14 }}>
              {t('demoSuggerimento')}
            </div>
          )}
          <p className="versione-intro" style={{ marginTop: 12, fontWeight: 600 }}>
            {t('buonLavoro')}
          </p>
        </div>

        <div className="versione-footer">
          {conGiorni && mostraPiani && (
            <Link href="/abbonati" className="btn-ghost" onClick={chiudi} style={{ marginRight: 8 }}>
              {t('vediPiani')}
            </Link>
          )}
          <button className="btn" onClick={chiudi} type="button">
            {t('iniziamo')}
          </button>
        </div>
      </div>
    </div>
  )
}
