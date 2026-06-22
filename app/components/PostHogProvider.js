'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

let inizializzato = false

export default function PostHogProvider({ children }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key || inizializzato) return
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true, // necessario per calcolare il tempo passato su ogni pagina
      session_recording: { maskAllInputs: false }, // utile per vedere DOVE si bloccano i tester
    })
    inizializzato = true
  }, [])

  return children
}

// Helper riutilizzabile per identificare un utente loggato presso PostHog,
// così nella dashboard puoi filtrare per singolo tester o per gruppo "test".
export function identificaUtente({ id, email, ruolo, isTest }) {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.identify(id, { email, ruolo, gruppo: isTest ? 'utenti_test_lancio' : 'produzione' })
}

// Helper per tracciare eventi custom (es. inizio/fine di una funzionalità).
// name: nome evento (es. "allenamento_creazione_avviata")
// props: dati aggiuntivi opzionali
export function trackEvento(name, props = {}) {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.capture(name, props)
}
