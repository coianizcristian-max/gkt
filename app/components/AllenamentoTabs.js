'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

const SCHEDE = ['dettaglio', 'valutazioni', 'esercizi']

// La scheda aperta sta anche nell'indirizzo (?tab=esercizi): dopo un
// salvataggio la pagina si aggiorna e si resta sulla stessa scheda, invece di
// tornare a "Dettaglio".
export default function AllenamentoTabs({ dettaglio, valutazioni, esercizi, feedback, iniziale = 'dettaglio' }) {
  const t = useTranslations('allenamentoTabs')
  const [tab, setTabState] = useState(SCHEDE.includes(iniziale) ? iniziale : 'dettaglio')
  function setTab(nuova) {
    setTabState(nuova)
    try {
      const url = new URL(window.location.href)
      if (nuova === 'dettaglio') url.searchParams.delete('tab')
      else url.searchParams.set('tab', nuova)
      window.history.replaceState(window.history.state, '', url)
    } catch {}
  }

  return (
    <div>
      <div className="sub-nav at-tabs" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`sub-nav-link ${tab === 'dettaglio' ? 'active' : ''}`}
          onClick={() => setTab('dettaglio')}
        >{t('dettaglio')}</button>
        <button
          type="button"
          className={`sub-nav-link ${tab === 'valutazioni' ? 'active' : ''}`}
          onClick={() => setTab('valutazioni')}
        >{t('valutazioni')}</button>
        <button
          type="button"
          className={`sub-nav-link ${tab === 'esercizi' ? 'active' : ''}`}
          onClick={() => setTab('esercizi')}
        >{t('esercizi')}</button>
      </div>

      {tab === 'dettaglio'   && <div>{dettaglio}</div>}
      {tab === 'valutazioni' && <div>{valutazioni}{feedback}</div>}
      {tab === 'esercizi'    && <div>{esercizi}</div>}
    </div>
  )
}
