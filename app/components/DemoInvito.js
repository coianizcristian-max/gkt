'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { trackEvento } from '@/app/components/PostHogProvider'

// Invito a registrarsi per il visitatore della demo, UNA volta per visita:
// dopo 2 minuti oppure alla 5a pagina vista. E' un riquadro piccolo in basso
// (non un popup a tutto schermo): su mobile, dentro il browser di Instagram,
// lo spazio utile e' gia' poco. Si chiude con la X e non torna.
const K_INIZIO = 'gkt-demo-inizio'
const K_PAGINE = 'gkt-demo-pagine'
const K_VISTO = 'gkt-demo-invito-visto'
const DOPO_MS = 2 * 60 * 1000
const DOPO_PAGINE = 5

function leggi(k) { try { return sessionStorage.getItem(k) } catch { return null } }
function scrivi(k, v) { try { sessionStorage.setItem(k, v) } catch {} }

export default function DemoInvito() {
  const t = useTranslations('demo')
  const pathname = usePathname()
  const [visibile, setVisibile] = useState(false)

  useEffect(() => {
    if (leggi(K_VISTO)) return
    if (!leggi(K_INIZIO)) scrivi(K_INIZIO, String(Date.now()))
    const pagine = Number(leggi(K_PAGINE) || 0) + 1
    scrivi(K_PAGINE, String(pagine))

    const mostra = () => {
      if (leggi(K_VISTO)) return
      // se c'e' aperto il popup iniziale della demo, riprova tra poco
      if (document.querySelector('.versione-overlay')) { setTimeout(mostra, 5000); return }
      scrivi(K_VISTO, '1')
      setVisibile(true)
      trackEvento('demo_invito_mostrato', { pagine })
    }
    if (pagine >= DOPO_PAGINE) { mostra(); return }
    const trascorso = Date.now() - Number(leggi(K_INIZIO))
    const id = setTimeout(mostra, Math.max(0, DOPO_MS - trascorso))
    return () => clearTimeout(id)
  }, [pathname])

  if (!visibile) return null

  function prova() {
    trackEvento('demo_prova_click', { origine: 'invito' })
    window.location.href = '/api/ospite/esci?poi=registrati'
  }
  function chiudi() {
    trackEvento('demo_invito_chiuso')
    setVisibile(false)
  }

  return (
    <div className="demo-invito" role="dialog" aria-label={t('invitoTitolo')}>
      <button type="button" className="demo-invito-x" onClick={chiudi} aria-label={t('invitoChiudi')}>✕</button>
      <div className="demo-invito-titolo">{t('invitoTitolo')}</div>
      <div className="demo-invito-testo">{t('invitoTesto')}</div>
      <button type="button" className="btn demo-invito-btn" onClick={prova}>{t('invitoBottone')}</button>
    </div>
  )
}
