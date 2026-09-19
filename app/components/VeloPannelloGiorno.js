'use client'

import { useEffect } from 'react'

const MOBILE = '(max-width: 720px)'

/**
 * Sfondo scuro dietro il pannello del giorno nel calendario a griglia.
 * Su mobile il pannello (.calx-panel) diventa un popup che sale dal basso
 * (vedi globals.css): questo velo lo mette in evidenza, si chiude al tocco
 * e blocca lo scorrimento della pagina sotto. Su desktop non si vede e il
 * pannello resta sotto la griglia come prima.
 * Il tasto Esc chiude il pannello su tutti gli schermi.
 */
export default function VeloPannelloGiorno({ aperto, onChiudi }) {
  useEffect(() => {
    if (!aperto) return
    const esc = (e) => { if (e.key === 'Escape') onChiudi() }
    window.addEventListener('keydown', esc)

    let ripristina = null
    if (window.matchMedia?.(MOBILE).matches) {
      const prima = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      ripristina = () => { document.body.style.overflow = prima }
    }
    return () => {
      window.removeEventListener('keydown', esc)
      ripristina?.()
    }
  }, [aperto, onChiudi])

  if (!aperto) return null
  return <div className="calx-velo" onClick={onChiudi} aria-hidden="true" />
}
