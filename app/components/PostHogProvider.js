'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { nomePagina } from '@/lib/pagine-tracciate'

let inizializzato = false

export default function PostHogProvider({ children }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key || inizializzato) return
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      capture_pageview: false, // disattivato: usiamo il tracciamento manuale sotto, con nomi leggibili
      capture_pageleave: true, // necessario per calcolare il tempo passato su ogni pagina
      session_recording: { maskAllInputs: false }, // utile per vedere DOVE si bloccano i tester
    })
    inizializzato = true
  }, [])

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <TracciaCambioPagina />
      </Suspense>
      <TracciaClickCTA />
    </>
  )
}

// Intercetta i click su link e bottoni in tutto il sito, in modo che il
// percorso "atterro sulla home -> clicco una CTA -> arrivo al login" sia
// visibile come sequenza di eventi, senza dover instrumentare ogni pagina
// pubblica una per una.
function TracciaClickCTA() {
  useEffect(() => {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return

    function handleClick(e) {
      const el = e.target.closest('a, button')
      if (!el) return
      const testo = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60)
      const href = el.getAttribute('href') || null
      if (!testo && !href) return
      posthog.capture('cta_click', {
        testo_bottone: testo,
        destinazione: href,
        pagina_corrente: window.location.pathname,
      })
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  return null
}

// Componente separato: si appoggia a usePathname/useSearchParams di Next.js,
// che cambiano ad OGNI navigazione anche lato client (senza ricaricare la pagina),
// quindi cattura davvero tutto il percorso utente, non solo i caricamenti pieni.
function TracciaCambioPagina() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    const { nome, area } = nomePagina(pathname)
    const qs = searchParams?.toString()
    posthog.capture('$pageview', {
      $current_url: window.location.href,
      pagina_nome: nome,
      pagina_area: area,
      pagina_path: pathname,
    })
  }, [pathname, searchParams])

  return null
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
