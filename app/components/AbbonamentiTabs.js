'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import GatingManager from '@/app/components/GatingManager'
import AbbonamentiManager from '@/app/components/AbbonamentiManager'

export default function AbbonamentiTabs({ gating, abbonamenti, profili, stats }) {
  const t = useTranslations('abbonamentiTabs')
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
        <TabBtn id="prezzi">{t('tabPrezzi')}</TabBtn>
        <TabBtn id="manuali">{t('tabManuali')}</TabBtn>
      </div>

      {tab === 'prezzi' && (
        <GatingManager
          albero={gating.albero}
          tuttoFree={gating.tuttoFree}
          feeContatto={gating.feeContatto}
          prezziIniziali={gating.prezziIniziali}
          giorniIniziali={gating.giorniIniziali}
          lifetimeIniziale={gating.lifetimeIniziale}
        />
      )}

      {tab === 'manuali' && (
        <>
          <div className="scheda" style={{ display: 'flex', gap: 32, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.attivi}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{t('attivi')}</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.lifetime}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{t('lifetime')}</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.totali}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{t('totali')}</div>
            </div>
          </div>
          <AbbonamentiManager abbonamenti={abbonamenti} profili={profili} />
        </>
      )}
    </>
  )
}
