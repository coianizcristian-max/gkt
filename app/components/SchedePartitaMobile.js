'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Dettaglio partita (vista allenatore): SOLO SU MOBILE divide la pagina in due
 * schede, "Dettaglio" (dati della partita) e "Valutazioni". Su PC e tablet
 * largo le due parti restano una sotto l'altra come prima: la barra delle
 * schede e' nascosta via CSS (.pt-*, globals.css).
 * Entrambe le parti restano montate: passando da una scheda all'altra non si
 * perde niente di quello che si sta compilando.
 */
// Evento per passare da una parte all'altra (es. "Inserisci il risultato"
// dentro le valutazioni). Su mobile cambia scheda, su PC scorre alla sezione.
export const EVENTO_SCHEDA_PARTITA = 'gkt-partita-scheda'
export function vaiASchedaPartita(scheda) {
  window.dispatchEvent(new CustomEvent(EVENTO_SCHEDA_PARTITA, { detail: scheda }))
}

export default function SchedePartitaMobile({ dettaglio, valutazioni, etichette, iniziale = 'valutazioni' }) {
  const [tab, setTab] = useState(iniziale)
  const radice = useRef(null)

  useEffect(() => {
    const vai = (e) => {
      const scheda = e.detail === 'dettaglio' ? 'dettaglio' : 'valutazioni'
      setTab(scheda)
      const box = radice.current
      if (!box) return
      const mobile = window.matchMedia?.('(max-width: 720px)').matches
      const bersaglio = mobile ? box : box.querySelector(`.pt-${scheda}`)
      requestAnimationFrame(() => bersaglio?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
    window.addEventListener(EVENTO_SCHEDA_PARTITA, vai)
    return () => window.removeEventListener(EVENTO_SCHEDA_PARTITA, vai)
  }, [])

  return (
    <div className={`pt-schede pt-attiva-${tab}`} ref={radice}>
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
      <div className="pt-pannello pt-dettaglio">
        {dettaglio}
        {/* solo mobile: su PC le valutazioni sono gia' qui sotto */}
        {etichette.vaiValutazioni && (
          <button type="button" className="pt-vai" onClick={() => vaiASchedaPartita('valutazioni')}>
            {etichette.vaiValutazioni}
          </button>
        )}
      </div>
      <div className="pt-pannello pt-valutazioni">{valutazioni}</div>
    </div>
  )
}
