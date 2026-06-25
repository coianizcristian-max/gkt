'use client'
import { useState } from 'react'

export default function AllenamentoTabs({ dettaglio, valutazioni, esercizi, feedback }) {
  const [tab, setTab] = useState('dettaglio')

  return (
    <div>
      <div className="sub-nav" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`sub-nav-link ${tab === 'dettaglio' ? 'active' : ''}`}
          onClick={() => setTab('dettaglio')}
        >📋 Dettaglio</button>
        <button
          type="button"
          className={`sub-nav-link ${tab === 'valutazioni' ? 'active' : ''}`}
          onClick={() => setTab('valutazioni')}
        >⭐ Valutazioni</button>
        <button
          type="button"
          className={`sub-nav-link ${tab === 'esercizi' ? 'active' : ''}`}
          onClick={() => setTab('esercizi')}
        >📚 Esercizi</button>
      </div>

      {tab === 'dettaglio'   && <div>{dettaglio}</div>}
      {tab === 'valutazioni' && <div>{valutazioni}{feedback}</div>}
      {tab === 'esercizi'    && <div>{esercizi}</div>}
    </div>
  )
}
