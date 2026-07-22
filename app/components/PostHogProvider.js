'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { nomePagina } from '@/lib/pagine-tracciate'

let ph = null // istanza posthog, caricata lazy solo lato client

async function getPosthog() {
  if (ph) return ph
  if (typeof window === 'undefined') return null
  // Rispetta il consenso cookie GDPR — non caricare se non accettato
  const consenso = localStorage.getItem('gkt-cookie-consent')
  if (consenso !== 'accepted') return null
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  try {
    const mod = await import('posthog-js')
    ph = mod.default
    if (!ph.__loaded) {
      ph.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
        capture_pageview: false,
        capture_pageleave: true,
        session_recording: { maskAllInputs: false },
      })
      ph.__loaded = true
    }
    return ph
  } catch { return null }
}

export default function PostHogProvider({ children }) {
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

function TracciaCambioPagina() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    getPosthog().then((posthog) => {
      if (!posthog) return
      const { nome, area } = nomePagina(pathname)
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        pagina_nome: nome,
        pagina_area: area,
        pagina_path: pathname,
      })
    })
  }, [pathname, searchParams])

  return null
}

function TracciaClickCTA() {
  useEffect(() => {
    function handleClick(e) {
      const el = e.target.closest('a, button')
      if (!el) return
      const testo = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60)
      const href = el.getAttribute('href') || null
      if (!testo && !href) return
      getPosthog().then((posthog) => {
        if (!posthog) return
        posthog.capture('cta_click', {
          testo_bottone: testo,
          destinazione: href,
          pagina_corrente: window.location.pathname,
        })
      })
      // Segnala a Meta l'intenzione di registrarsi (evento standard Lead)
      if (href && href.includes('/registrati')) {
        import('@/app/components/MetaPixel').then((m) => m.trackMetaEvento('Lead')).catch(() => {})
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])
  return null
}

export function identificaUtente({ id, email, ruolo, isTest }) {
  if (typeof window === 'undefined') return
  getPosthog().then((posthog) => {
    if (!posthog) return
    posthog.identify(id, { email, ruolo, gruppo: isTest ? 'utenti_test_lancio' : 'produzione' })
  })
}

export function trackEvento(name, props = {}) {
  if (typeof window === 'undefined') return
  getPosthog().then((posthog) => {
    if (!posthog) return
    posthog.capture(name, props)
  })
}
