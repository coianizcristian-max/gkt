'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const PIXEL_ID = '1029177192853278'

// Carica il pixel Meta solo dopo il consenso cookie (stessa logica di PostHog).
// Ritorna window.fbq se disponibile, altrimenti null.
function getFbq() {
  if (typeof window === 'undefined') return null
  if (localStorage.getItem('gkt-cookie-consent') !== 'accepted') return null
  if (!window.fbq) {
    // Base code ufficiale Meta Pixel
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = !0
      n.version = '2.0'
      n.queue = []
      t = b.createElement(e)
      t.async = !0
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s.parentNode.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    /* eslint-enable */
    window.fbq('init', PIXEL_ID)
  }
  return window.fbq
}

// Traccia un evento standard Meta (es. 'CompleteRegistration', 'Lead').
// Non fa nulla se il consenso cookie non è stato dato.
export function trackMetaEvento(nome, params) {
  try {
    const fbq = getFbq()
    if (fbq) fbq('track', nome, params || {})
  } catch {}
}

export default function MetaPixel() {
  const pathname = usePathname()

  // PageView a ogni cambio pagina (se consenso dato)
  useEffect(() => {
    trackMetaEvento('PageView')
  }, [pathname])

  // Se l'utente accetta i cookie in questa sessione, manda subito il primo PageView
  useEffect(() => {
    const h = () => trackMetaEvento('PageView')
    window.addEventListener('gkt-consenso-accettato', h)
    return () => window.removeEventListener('gkt-consenso-accettato', h)
  }, [])

  return null
}
