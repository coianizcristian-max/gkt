'use client'

import { useState } from 'react'
import GatingManager from '@/app/components/GatingManager'
import AbbonamentiManager from '@/app/components/AbbonamentiManager'

// Unisce sotto un'unica pagina "Abbonamenti" due schede:
//  - Prezzi & funzionalità (l'editor ad albero + prezzi + fee + giorni prova)
//  - Abbonamenti manuali (la lista + creazione manuale)
export default function AbbonamentiTabs({ gating, abbonamenti, profili, stats }) {
  const [tab, setTab] = useState('prezzi')

  const TabBtn = ({ id, children }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`sub-nav-link ${tab === id ? 'active' : ''}`}
      style={{ cursor: 'pointer', background: 'none', border: 0 }}
    >
      {children}
    </button>
  )

  return (
    <>
      <div className="sub-nav" style={{ marginTop: 4 }}>
        <TabBtn id="prezzi">Prezzi &amp; funzionalità</TabBtn>
        <TabBtn id="manuali">Abbonamenti manuali</TabBtn>
      </div>

      {tab === 'prezzi' && (
        <GatingManager
          albero={gating.albero}
          tuttoFree={gating.tuttoFree}
          feeContatto={gating.feeContatto}
          prezziIniziali={gating.prezziIniziali}
          giorniIniziali={gating.giorniIniziali}
        />
      )}

      {tab === 'manuali' && (
        <>
          <div className="scheda" style={{ display: 'flex', gap: 32, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.attivi}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Abbonamenti attivi</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.lifetime}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Piani Lifetime</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.totali}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>Totale storici</div>
            </div>
          </div>
          <AbbonamentiManager abbonamenti={abbonamenti} profili={profili} />
        </>
      )}
    </>
  )
}
