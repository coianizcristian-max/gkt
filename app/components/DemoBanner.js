'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { trackEvento } from '@/app/components/PostHogProvider'

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
  const ref = useRef(null)

  // Altezza reale della fascia in --demo-h: il CSS la usa per spostare in
  // basso contenuto e intestazione mobile (col menu), che altrimenti finiscono
  // sotto la fascia quando va a capo su schermi stretti.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const aggiorna = () => root.style.setProperty('--demo-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    aggiorna()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(aggiorna) : null
    ro?.observe(el)
    window.addEventListener('resize', aggiorna)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', aggiorna)
      root.style.removeProperty('--demo-h')
    }
  }, [])

  // Ospite: esce dalla demo e va alla registrazione
  function provaGratis(origine) {
    setUscendo(true)
    trackEvento('demo_prova_click', { origine })
    window.location.href = '/api/ospite/esci?poi=registrati'
  }

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
    <div className="demo-banner" role="status" ref={ref}>
      <span className="demo-banner-pallino" aria-hidden="true" />
      <span className="demo-banner-testo">
        {/* su mobile, per l'ospite, titolo corto: lo spazio va al pulsante */}
        <b className={ospite ? 'demo-titolo-lungo' : undefined}>{t('bannerTitolo')}</b>
        {ospite && <b className="demo-titolo-breve">{t('bannerTitoloBreve')}</b>}
        <span className="demo-banner-data">{t('bannerData', { data: dataLeggibile(dataTaglio, locale) })}</span>
      </span>
      {ospite ? (
        <>
          <button type="button" className="demo-banner-prova" onClick={() => provaGratis('fascia')} disabled={uscendo}>
            <span className="demo-prova-lungo">{t('bannerProvaLungo')}</span>
            <span className="demo-prova-breve">{t('bannerProva')}</span>
          </button>
          <button type="button" className="demo-banner-esci-link" onClick={esci} disabled={uscendo}>
            {t('bannerEsciBreve')}
          </button>
        </>
      ) : (
        <button type="button" className="demo-banner-esci" onClick={esci} disabled={uscendo}>
          {uscendo ? t('bannerUscita') : t('bannerEsci')}
        </button>
      )}
    </div>
  )
}
