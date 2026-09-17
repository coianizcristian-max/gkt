'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Blocca le scritture mentre si naviga la stagione demo.
 *
 * Non basta disabilitare i pulsanti: i form sono renderizzati con la sessione
 * dell'utente reale, quindi un salvataggio scriverebbe nei SUOI dati. Qui si
 * interviene sulla rete: le richieste di scrittura verso Supabase e verso le
 * API dell'app vengono fermate prima di partire e mostrano un messaggio, cosi'
 * l'utente capisce che e' la demo e non un malfunzionamento.
 */
export default function DemoGuardia() {
  const t = useTranslations('demo')
  const [avviso, setAvviso] = useState(false)

  useEffect(() => {
    const originale = window.fetch.bind(window)
    const SCRITTURE = ['POST', 'PUT', 'PATCH', 'DELETE']
    // Rotte che devono continuare a funzionare anche in demo.
    const CONSENTITE = ['/api/demo', '/auth/signout', '/api/benvenuto-visto', '/api/versione-vista']

    window.fetch = async (input, init) => {
      try {
        const url = typeof input === 'string' ? input : (input?.url ?? '')
        const metodo = (init?.method ?? (typeof input === 'object' ? input?.method : 'GET') ?? 'GET').toUpperCase()
        const scrive = SCRITTURE.includes(metodo)
        const consentita = CONSENTITE.some((r) => url.includes(r))
        const versoDati = url.includes('/rest/v1/') || url.includes('/storage/v1/') || url.includes('/api/')

        if (scrive && versoDati && !consentita) {
          setAvviso(true)
          return new Response(
            JSON.stringify({ message: 'DEMO_SOLA_LETTURA', code: 'DEMO' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
          )
        }
      } catch { /* in caso di dubbio si lascia passare la lettura */ }
      return originale(input, init)
    }

    return () => { window.fetch = originale }
  }, [])

  useEffect(() => {
    if (!avviso) return
    const id = setTimeout(() => setAvviso(false), 5000)
    return () => clearTimeout(id)
  }, [avviso])

  if (!avviso) return null

  return (
    <div className="demo-avviso" role="alert">
      <b>{t('bloccoTitolo')}</b>
      <span>{t('bloccoTesto')}</span>
      <button type="button" onClick={() => setAvviso(false)} aria-label="ok">✕</button>
    </div>
  )
}
