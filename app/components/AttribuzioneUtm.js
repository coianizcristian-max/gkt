'use client'

import { useEffect } from 'react'

// Salva i parametri di attribuzione (utm_*, fbclid) al primo atterraggio
// della sessione, così la registrazione può essere ricondotta alla campagna
// che l'ha generata. Usa sessionStorage: vive solo per la sessione corrente.
const CHIAVE = 'gkt-attribuzione'

export function leggiAttribuzione() {
  try {
    const raw = sessionStorage.getItem(CHIAVE)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/**
 * Fonte di arrivo in una parola, da salvare con l'iscrizione alla newsletter:
 *  - utm_source se presente (es. 'facebook', 'instagram', 'newsletter')
 *  - 'meta_ads'    se il link aveva fbclid (clic su inserzione Meta senza UTM)
 *  - 'social_meta' se si arriva da facebook.com / instagram.com senza fbclid
 *  - null          se diretto / sconosciuto
 */
export function fonteAttribuzione() {
  const a = leggiAttribuzione()
  if (!a) return null
  if (a.utm_source) return String(a.utm_source).toLowerCase().slice(0, 40)
  if (a.da_meta_ads) return 'meta_ads'
  if (a.da_social_meta) return 'social_meta'
  return null
}

export default function AttribuzioneUtm() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHIAVE)) return
      const sp = new URLSearchParams(window.location.search)
      const dati = {}
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
        if (sp.get(k)) dati[k] = sp.get(k)
      }
      if (sp.get('fbclid')) dati.da_meta_ads = true
      // Arrivo da Facebook/Instagram senza fbclid (post, bio, condivisioni)
      try {
        const ref = document.referrer ? new URL(document.referrer).hostname : ''
        if (/(^|\.)(facebook|instagram)\.com$/i.test(ref) || /^(l|lm|m)\.facebook\.com$/i.test(ref)) {
          dati.da_social_meta = true
        }
      } catch {}
      if (Object.keys(dati).length > 0) {
        dati.landing = window.location.pathname
        sessionStorage.setItem(CHIAVE, JSON.stringify(dati))
      }
    } catch {}
  }, [])
  return null
}
