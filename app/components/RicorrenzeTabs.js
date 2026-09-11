'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import RicorrenzeManager, { EliminazioneRapida } from '@/app/components/RicorrenzeManager'
import RicorrenzePartiteManager from '@/app/components/RicorrenzePartiteManager'

export default function RicorrenzeTabs({ stagione, categorie, ricorrenze, ricorrenzePartite }) {
  const t = useTranslations('ricorrenzeTabs')
  const [tab, setTab] = useState('allenamenti')

  return (
    <>
      <div className="sub-nav" style={{ marginBottom: 20 }}>
        <button type="button" className={`sub-nav-link ${tab === 'allenamenti' ? 'active' : ''}`} onClick={() => setTab('allenamenti')}>
          {t('allenamenti')}
        </button>
        <button type="button" className={`sub-nav-link ${tab === 'partite' ? 'active' : ''}`} onClick={() => setTab('partite')}>
          {t('partite')}
        </button>
      </div>

      {tab === 'allenamenti'
        ? <RicorrenzeManager stagione={stagione} categorie={categorie} ricorrenze={ricorrenze} />
        : <RicorrenzePartiteManager stagione={stagione} categorie={categorie} ricorrenzePartite={ricorrenzePartite} />}

      <EliminazioneRapida stagione={stagione} categorie={categorie} />
    </>
  )
}
