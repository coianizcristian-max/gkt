'use client'

import { useEffect } from 'react'
import { identificaUtente } from '@/app/components/PostHogProvider'

// Componente "invisibile": riceve i dati dell'utente loggato dal layout server
// e li passa a PostHog per identificarlo nella dashboard di analytics.
export default function IdentificaUtenteTracking({ id, email, ruolo }) {
  useEffect(() => {
    if (!id) return
    const isTest = !!email && email.endsWith('@gkt-test.it')
    identificaUtente({ id, email, ruolo, isTest })
  }, [id, email, ruolo])

  return null
}
