'use client'

import { useState, useEffect } from 'react'
import NewsletterSignup from './NewsletterSignup'

/**
 * Riquadro di iscrizione alla newsletter mostrato SOLO al visitatore arrivato
 * da /d (utente vetrina), mai a un preparatore gia' registrato che entra in
 * demo dal menu: quello e' gia' nel sistema e vedersi proporre l'iscrizione
 * sarebbe fuori luogo.
 *
 * Il filtro non e' qui dentro: e' il layout che monta questo componente solo
 * quando il cookie gk_ospite e' presente.
 *
 * Non blocca nulla. Chi vuole guardare e basta lo chiude e continua: il senso
 * di /d e' far vedere l'app senza chiedere niente, e un muro davanti alla
 * demo annullerebbe il vantaggio.
 *
 * Riusa NewsletterSignup e le sue chiavi di traduzione esistenti, quindi non
 * introduce testi nuovi da tradurre.
 */
export default function DemoOspiteNewsletter() {
  // null = non ancora deciso: evita che il riquadro lampeggi prima di sapere
  // se l'utente lo aveva gia' chiuso.
  const [visibile, setVisibile] = useState(null)

  useEffect(() => {
    try {
      setVisibile(sessionStorage.getItem('gk_demo_nl_chiuso') !== '1')
    } catch {
      setVisibile(true)
    }
  }, [])

  function chiudi() {
    try {
      sessionStorage.setItem('gk_demo_nl_chiuso', '1')
    } catch {
      // se sessionStorage non e' disponibile lo chiudiamo comunque per questa
      // pagina: tornera' al prossimo caricamento, ma non e' un problema
    }
    setVisibile(false)
  }

  if (!visibile) return null

  return (
    <div
      style={{
        position: 'relative',
        margin: '12px auto 4px',
        maxWidth: 620,
        padding: '16px 40px 16px 20px',
        background: 'rgba(232,167,44,0.10)',
        border: '1px solid var(--giallo, #e8a72c)',
        borderRadius: 'var(--r-sm, 10px)',
      }}
    >
      <button
        type="button"
        onClick={chiudi}
        aria-label="×"
        title="×"
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          fontSize: 20,
          lineHeight: 1,
          padding: 4,
          color: 'var(--ink-soft, #6b7e8e)',
        }}
      >
        ×
      </button>

      <NewsletterSignup />
    </div>
  )
}
