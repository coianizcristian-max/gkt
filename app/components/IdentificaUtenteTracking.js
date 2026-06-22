'use client'

import { useEffect } from 'react'
import { identificaUtente, trackEvento } from '@/app/components/PostHogProvider'

const CHIAVE_SESSIONE = 'gkt_primo_accesso_tracciato'

// Componente "invisibile": riceve i dati dell'utente loggato dal layout server
// e li passa a PostHog per identificarlo nella dashboard di analytics.
// Manda anche un evento "primo accesso area riservata" una sola volta per
// sessione browser — utile per capire quanto è fluido il passaggio
// login/registrazione -> primo utilizzo reale del sito.
export default function IdentificaUtenteTracking({ id, email, ruolo }) {
  useEffect(() => {
    if (!id) return
    const isTest = !!email && email.endsWith('@gkt-test.it')
    identificaUtente({ id, email, ruolo, isTest })

    if (typeof window !== 'undefined' && !window.sessionStorage.getItem(CHIAVE_SESSIONE)) {
      window.sessionStorage.setItem(CHIAVE_SESSIONE, '1')
      trackEvento('area_riservata_primo_accesso_sessione', { ruolo })
    }
  }, [id, email, ruolo])

  return null
}
