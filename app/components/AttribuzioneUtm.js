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
      if (Object.keys(dati).length > 0) {
        dati.landing = window.location.pathname
        sessionStorage.setItem(CHIAVE, JSON.stringify(dati))
      }
    } catch {}
  }, [])
  return null
}
