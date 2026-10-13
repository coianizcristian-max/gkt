'use client'

import { useEffect } from 'react'

/**
 * Tag di conversione Google Ads (gtag.js), stessa logica del Pixel Meta:
 * NON viene caricato finche' il visitatore non accetta i cookie.
 *
 * Variabili d'ambiente (Vercel + .env.local), tutte NEXT_PUBLIC_ perche'
 * servono nel browser:
 *   NEXT_PUBLIC_GADS_ID                   es. AW-123456789
 *   NEXT_PUBLIC_GADS_LABEL_REGISTRAZIONE  etichetta della conversione "Registrazione"
 *   NEXT_PUBLIC_GADS_LABEL_DEMO           etichetta della conversione "Demo aperta"
 *
 * Senza NEXT_PUBLIC_GADS_ID il componente non fa nulla: nessuno script
 * caricato, nessuna chiamata. Senza un'etichetta, quella conversione viene
 * semplicemente saltata.
 *
 * Le conversioni partono da:
 *   - RegistratiClient.js  -> trackGoogleConversione('registrazione')
 *   - DemoTracker.js       -> trackGoogleConversione('demo')
 *
 * NB: il gclid (il codice che Google aggiunge ai link degli annunci) viene
 * letto da gtag al momento in cui lo script parte. Quindi la conversione
 * viene attribuita all'annuncio solo se il visitatore accetta i cookie
 * sulla pagina di atterraggio (dove il gclid e' ancora nell'indirizzo).
 * Chi accetta piu' tardi, su un'altra pagina, viene contato da PostHog
 * (gclid salvato da AttribuzioneUtm) ma non da Google Ads.
 */
const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID || ''
const ETICHETTE = {
  registrazione: process.env.NEXT_PUBLIC_GADS_LABEL_REGISTRAZIONE || '',
  demo: process.env.NEXT_PUBLIC_GADS_LABEL_DEMO || '',
}

function consensoDato() {
  try { return localStorage.getItem('gkt-cookie-consent') === 'accepted' } catch { return false }
}

// Carica gtag.js (una volta sola) e ritorna window.gtag, oppure null se
// manca l'ID o il consenso.
function getGtag() {
  if (typeof window === 'undefined') return null
  if (!GADS_ID) return null
  if (!consensoDato()) return null
  if (!window.__gktGtagCaricato) {
    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer.push(arguments) }
    // Consent Mode v2: lo script parte solo dopo il consenso, quindi qui
    // e' tutto "granted". Dichiararlo evita che gtag lavori in modalita'
    // ridotta e tiene il tag allineato alla scelta dell'utente.
    window.gtag('consent', 'default', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    })
    window.gtag('js', new Date())
    window.gtag('config', GADS_ID)
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GADS_ID)}`
    document.head.appendChild(s)
    window.__gktGtagCaricato = true
  }
  return window.gtag
}

/**
 * Segnala una conversione a Google Ads.
 *   tipo: 'registrazione' | 'demo'
 * Non fa nulla senza consenso, senza ID o senza etichetta per quel tipo.
 */
export function trackGoogleConversione(tipo, params) {
  try {
    const etichetta = ETICHETTE[tipo]
    if (!etichetta) return
    const gtag = getGtag()
    if (!gtag) return
    gtag('event', 'conversion', { send_to: `${GADS_ID}/${etichetta}`, ...(params || {}) })
  } catch {}
}

export default function GoogleAds() {
  // Primo caricamento: se il consenso c'e' gia', parte subito (cosi' il gclid
  // nell'indirizzo viene letto sulla pagina di atterraggio).
  useEffect(() => {
    getGtag()
  }, [])

  // Consenso dato in questa sessione: carica adesso, finche' siamo ancora
  // sulla pagina dove e' arrivato il clic dell'annuncio.
  useEffect(() => {
    const h = () => getGtag()
    window.addEventListener('gkt-consenso-accettato', h)
    return () => window.removeEventListener('gkt-consenso-accettato', h)
  }, [])

  return null
}
