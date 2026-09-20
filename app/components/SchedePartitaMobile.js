'use client'

import { useState } from 'react'

/**
 * Dettaglio partita (vista allenatore): SOLO SU MOBILE divide la pagina in due
 * schede, "Dettaglio" (dati della partita) e "Valutazioni". Su PC e tablet
 * largo le due parti restano una sotto l'altra come prima: la barra delle
 * schede e' nascosta via CSS (.pt-*, globals.css).
 * Entrambe le parti restano montate: passando da una scheda all'altra non si
 * perde niente di quello che si sta compilando.
 */
export default function SchedePartitaMobile({ dettaglio, valutazioni, etichette, iniziale = 'valutazioni' }) {
  const [tab, setTab] = useState(iniziale)
  return (
    <div className={`pt-schede pt-attiva-${tab}`}>
      <div className="pt-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'dettaglio'}
          className={`pt-tab ${tab === 'dettaglio' ? 'active' : ''}`} onClick={() => setTab('dettaglio')}>
          {etichette.dettaglio}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'valutazioni'}
          className={`pt-tab ${tab === 'valutazioni' ? 'active' : ''}`} onClick={() => setTab('valutazioni')}>
          {etichette.valutazioni}
          {etichette.conteggio && <span className="pt-tab-conta">{etichette.conteggio}</span>}
        </button>
      </div>
      <div className="pt-pannello pt-dettaglio">{dettaglio}</div>
      <div className="pt-pannello pt-valutazioni">{valutazioni}</div>
    </div>
  )
}
