'use client'

import { useState } from 'react'
import Link from 'next/link'

// Popup di benvenuto mostrato UNA volta al primo accesso. Riusa lo stesso stile
// del popup di versione (.versione-overlay/.versione-popup) per coerenza.
export default function BenvenutoPopup({ nome, giorni, ruolo }) {
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
  const sottotitolo = ruolo === 'portiere'
    ? 'La tua stagione sportiva e la tua crescita tra i pali iniziano qui.'
    : 'La tua stagione sportiva e la preparazione dei tuoi portieri iniziano qui.'

  return (
    <div className="versione-overlay">
      <div className={`versione-popup ${closing ? 'closing' : ''}`}>
        <div className="versione-header">
          <div>
            <div className="versione-badge">🎁 Benvenuto</div>
            <h2 className="versione-titolo">
              Ciao{nome ? ` ${nome}` : ''}, benvenuto a bordo di GKSeason.it!
            </h2>
          </div>
          <button className="versione-close" onClick={chiudi} type="button">✕</button>
        </div>

        <div className="versione-body">
          <p className="versione-intro">{sottotitolo}</p>
          {conGiorni && (
            <p className="versione-intro" style={{ marginTop: 12 }}>
              Per iniziare al meglio, goditi <b>{giorni} giorni</b> di accesso totalmente gratuito
              a tutte le funzionalità avanzate dell&apos;app. Alla scadenza, sarai tu a decidere:
              potrai continuare con la versione gratuita o sbloccare tutte le funzioni abbonandoti.
            </p>
          )}
          <p className="versione-intro" style={{ marginTop: 12, fontWeight: 600 }}>
            Mettiti comodo e buon lavoro!
          </p>
        </div>

        <div className="versione-footer">
          {conGiorni && (
            <Link href="/abbonati" className="btn-ghost" onClick={chiudi} style={{ marginRight: 8 }}>
              Vedi i piani
            </Link>
          )}
          <button className="btn" onClick={chiudi} type="button">
            Iniziamo &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
