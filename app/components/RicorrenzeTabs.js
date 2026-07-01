'use client'

import { useState } from 'react'
import RicorrenzeManager, { EliminazioneRapida } from '@/app/components/RicorrenzeManager'
import RicorrenzePartiteManager from '@/app/components/RicorrenzePartiteManager'

export default function RicorrenzeTabs({ stagione, categorie, ricorrenze, ricorrenzePartite }) {
  const [tab, setTab] = useState('allenamenti')

  return (
    <>
      <div className="sub-nav" style={{ marginBottom: 20 }}>
        <button type="button" className={`sub-nav-link ${tab === 'allenamenti' ? 'active' : ''}`} onClick={() => setTab('allenamenti')}>
          Allenamenti
        </button>
        <button type="button" className={`sub-nav-link ${tab === 'partite' ? 'active' : ''}`} onClick={() => setTab('partite')}>
          Partite
        </button>
      </div>

      {tab === 'allenamenti'
        ? <RicorrenzeManager stagione={stagione} categorie={categorie} ricorrenze={ricorrenze} />
        : <RicorrenzePartiteManager stagione={stagione} categorie={categorie} ricorrenzePartite={ricorrenzePartite} />}

      <EliminazioneRapida stagione={stagione} categorie={categorie} />
    </>
  )
}
