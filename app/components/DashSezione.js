'use client'

import { Children, useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Riquadro della dashboard con elenco.
 *  - Su MOBILE si apre e chiude toccando il titolo (aperto di default solo
 *    quello indicato con `aperta`): la dashboard si legge a colpo d'occhio
 *    dai titoli con i conteggi, senza scorrere metri di elenchi.
 *  - Su PC e' sempre aperto (il titolo non e' cliccabile).
 *  - In entrambi i casi mostra le prime `limite` righe + "Mostra tutti (N)".
 */
export default function DashSezione({ titolo, colore, aperta = false, limite = 5, className = '', children }) {
  const t = useTranslations('dashboard')
  const [aperto, setAperto] = useState(aperta)
  const [tutti, setTutti] = useState(false)
  const righe = Children.toArray(children)
  const visibili = tutti ? righe : righe.slice(0, limite)
  const nascoste = righe.length - visibili.length

  return (
    <div className={`scheda dsz ${className}`} style={{ marginBottom: 16, borderLeft: `4px solid ${colore}`, maxWidth: 'none' }}>
      <button type="button" className="dsz-testa" onClick={() => setAperto(!aperto)} aria-expanded={aperto}>
        {/* span (non h3): un titolo dentro un pulsante non e' HTML valido */}
        <span className="dsz-titolo" style={{ color: colore }}>{titolo}</span>
        <span className={`dsz-freccia${aperto ? ' su' : ''}`} aria-hidden="true">▾</span>
      </button>
      <div className={`dsz-corpo${aperto ? '' : ' chiusa'}`}>
        {visibili}
        {nascoste > 0 && (
          <button type="button" className="dsz-altri" onClick={() => setTutti(true)}>
            {t('mostraTutti', { n: righe.length })}
          </button>
        )}
      </div>
    </div>
  )
}
