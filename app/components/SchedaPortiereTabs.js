'use client'

import { useState } from 'react'

/**
 * Scheda portiere (vista staff): due sottoschede sotto il menu della scheda.
 *  - "Anagrafica": stato (tag), infortunio e dati del portiere
 *  - "Assenze": le assenze annunciate, prima in fondo alla pagina e difficili
 *    da trovare
 * Entrambe restano montate: passando da una all'altra non si perde quello che
 * si sta compilando.
 */
export default function SchedaPortiereTabs({ anagrafica, assenze, etichette }) {
  const [tab, setTab] = useState('anagrafica')
  return (
    <div className={`spt spt-${tab}`}>
      <div className="sub-nav spt-tabs">
        <button type="button" className={`sub-nav-link ${tab === 'anagrafica' ? 'active' : ''}`} onClick={() => setTab('anagrafica')}>
          {etichette.anagrafica}
        </button>
        <button type="button" className={`sub-nav-link ${tab === 'assenze' ? 'active' : ''}`} onClick={() => setTab('assenze')}>
          {etichette.assenze}
        </button>
      </div>
      <div className="spt-p spt-p-anagrafica">{anagrafica}</div>
      <div className="spt-p spt-p-assenze">{assenze}</div>
    </div>
  )
}
