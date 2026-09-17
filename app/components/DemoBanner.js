'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

const DATE_LOCALE = { it: 'it-IT', en: 'en-GB', de: 'de-DE', es: 'es-ES' }

function dataLeggibile(iso, locale) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(DATE_LOCALE[locale] || 'it-IT',
    { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Fascia fissa in alto: ricorda sempre che si sta guardando la demo.
 *
 * `ospite` = sessione vetrina entrata dal QR (/d). Quell'account non ha dati
 * propri, quindi uscire dalla demo lo porterebbe su una dashboard vuota: lo
 * mandiamo invece sul sito pubblico, chiudendo la sessione.
 */
export default function DemoBanner({ dataTaglio, ospite = false }) {
  const t = useTranslations('demo')
  const locale = useLocale()
  const [uscendo, setUscendo] = useState(false)

  async function esci() {
    setUscendo(true)
    if (ospite) {
      // signOut + pulizia cookie + ritorno alla home, in una sola navigazione
      window.location.href = '/api/ospite/esci'
      return
    }
    await fetch('/api/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione: 'esci' }),
    })
    window.location.href = '/dashboard'
  }

  return (
    <div className="demo-banner" role="status">
      <span className="demo-banner-pallino" aria-hidden="true" />
      <span className="demo-banner-testo">
        <b>{t('bannerTitolo')}</b>
        <span className="demo-banner-data">{t('bannerData', { data: dataLeggibile(dataTaglio, locale) })}</span>
      </span>
      <button type="button" className="demo-banner-esci" onClick={esci} disabled={uscendo}>
        {uscendo ? t('bannerUscita') : t('bannerEsci')}
      </button>
    </div>
  )
}
