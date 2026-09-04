'use client'

import { useState } from 'react'
import Link from 'next/link'

// Popup di benvenuto mostrato UNA volta al primo accesso. Riusa lo stesso stile
// del popup di versione (.versione-overlay/.versione-popup) per coerenza.
export default function BenvenutoPopup({ nome, giorni }) {
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
            <div className="versione-badge">🎁 Benvenuto</div>
            <h2 className="versione-titolo">
              Ciao{nome ? ` ${nome}` : ''}, benvenuto in GKSeason!
            </h2>
          </div>
          <button className="versione-close" onClick={chiudi} type="button">✕</button>
        </div>

        <div className="versione-body">
          {conGiorni ? (
            <>
              <p className="versione-intro">
                Per iniziare col piede giusto ti abbiamo attivato <b>{giorni} giorni</b> di
                <b> accesso completo a tutte le funzionalità</b>, gratis e senza carta.
              </p>
              <ul className="versione-lista">
                <li className="versione-item">
                  <span className="versione-bullet">✓</span>
                  <span>In questi {giorni} giorni hai tutto sbloccato: provalo con calma.</span>
                </li>
                <li className="versione-item">
                  <span className="versione-bullet">✓</span>
                  <span>Alla fine del periodo continui a usare GKSeason con le funzioni gratuite.</span>
                </li>
                <li className="versione-item">
                  <span className="versione-bullet">✓</span>
                  <span>Se vuoi tenere tutto attivo, ti basta sottoscrivere l&apos;abbonamento — quando vuoi.</span>
                </li>
              </ul>
            </>
          ) : (
            <p className="versione-intro">
              Il tuo account è pronto: da qui organizzi stagione, portieri, allenamenti e valutazioni.
            </p>
          )}
        </div>

        <div className="versione-footer">
          {conGiorni && (
            <Link href="/abbonati" className="btn-ghost" onClick={chiudi} style={{ marginRight: 8 }}>
              Vedi i piani
            </Link>
          )}
          <button className="btn" onClick={chiudi} type="button">
            Iniziamo →
          </button>
        </div>
      </div>
    </div>
  )
}
