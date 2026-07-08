'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Piccolo componente client: controlla la sessione nel browser (non blocca
// la cache della pagina, che è server-rendered e cacheata). Di default mostra
// la vista "ospite" (la maggioranza dei visitatori della home non è loggata),
// e passa a quella "loggato" appena il controllo lato client lo conferma.
export default function AreaLoginCta({ variant }) {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    let annullato = false
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!annullato) setLoggedIn(!!user)
    }
    check()
    return () => { annullato = true }
  }, [])

  if (variant === 'nav') {
    return loggedIn
      ? <Link href="/dashboard" className="link-accedi">La mia area</Link>
      : <Link href="/login" className="link-accedi">Accedi</Link>
  }

  // variant === 'hero'
  return loggedIn ? (
    <Link href="/dashboard" className="cta-card">
      <span className="cta-text">
        <span className="cta-eyebrow">Area gestione</span>
        <strong>Entra nella tua area operativa</strong>
        <span className="cta-sub">Portieri · Calendario · Partite · Statistiche</span>
      </span>
      <span className="cta-arrow" aria-hidden="true">&rarr;</span>
    </Link>
  ) : (
    <div className="cta-guest">
      <Link href="/login" className="btn-hero">Accedi all&apos;area gestione</Link>
      <span className="cta-guest-note">Riservata allo staff tecnico e ai portieri.</span>
    </div>
  )
}
